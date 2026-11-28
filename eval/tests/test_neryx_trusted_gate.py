import contextlib, copy, io, json, os, pathlib, textwrap, unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.parse import urlsplit, parse_qs

WORKFLOW = pathlib.Path(__file__).resolve().parents[2] / '.github/workflows/neryx-genesis-candidate-trusted.yml'
SOURCE = textwrap.dedent(WORKFLOW.read_text().split("python3 - <<'PY'\n",1)[1].rsplit('          PY',1)[0])
CODE = compile(SOURCE, str(WORKFLOW), 'exec')
ROOT = 'https://api.github.example/repos/example/repo/pulls/1'
HEAD, BASE = 'a'*40, 'b'*40

def file(path, status='modified', **kw): return dict(filename=path,status=status,**kw)

def run_gate(files, *, branch='neryx/auto/test', count=None, final=None, initial=None, pages=None, error=False):
    snapshot = dict(state='open', head=dict(sha=HEAD,ref=branch),base=dict(sha=BASE),changed_files=len(files) if count is None else count)
    start=copy.deepcopy(snapshot); end=copy.deepcopy(snapshot)
    start.update(initial or {}); end.update(final or {})
    requests=[]
    def fetch(request,timeout):
        url=request.full_url; requests.append(url)
        assert timeout==15
        assert request.get_header('Authorization')=='Bearer dummy-token'
        if url==ROOT: data=start if requests.count(ROOT)==1 else end
        elif url.startswith(ROOT+'/files?'):
            if error: raise HTTPError(url,403,'mock forbidden',{},None)
            page=int(parse_qs(urlsplit(url).query)['page'][0]); data=pages[page-1] if pages is not None else files[(page-1)*100:page*100]
        else: raise AssertionError('Unexpected request')
        return io.BytesIO(json.dumps(data).encode())
    output=io.StringIO()
    with patch.dict(os.environ,dict(REPOSITORY='example/repo',PR_NUMBER='1',API_URL='https://api.github.example',GH_TOKEN='dummy-token',HEAD_REF=branch,EXPECTED_HEAD=HEAD,EXPECTED_BASE=BASE),clear=True),patch('urllib.request.urlopen',side_effect=fetch),contextlib.redirect_stdout(output):
        try: exec(CODE,{})
        except Exception as e: return False,str(e),requests
    return True,output.getvalue(),requests

class GateTests(unittest.TestCase):
    def allow(self,files,**kw):
        ok,msg,req=run_gate(files,**kw); self.assertTrue(ok,msg); return msg,req
    def deny(self,files,**kw):
        ok,msg,req=run_gate(files,**kw); self.assertFalse(ok,msg); self.assertNotIn('PASS:',msg)
    def test_auto_allowed(self): self.allow([file('candidates/a.json')])
    def test_auto_eval_candidate_allowed(self): self.allow([file('eval/candidates/a.json')])
    def test_auto_workflow_denied(self): self.deny([file('.github/workflows/gate.yml')])
    def test_auto_deleted_protected(self): self.deny([file('eval/analyzer.mjs','removed')])
    def test_auto_renamed_protected(self): self.deny([file('candidates/a','renamed',previous_filename='.github/a')])
    def test_auto_rename_allowed(self): self.allow([file('candidates/a','renamed',previous_filename='candidates/b')])
    def test_rename_missing_origin(self): self.deny([file('candidates/a','renamed')])
    def test_copy_protected(self): self.deny([file('candidates/a','copied',previous_filename='eval/a')])
    def test_copy_missing_origin(self): self.deny([file('candidates/a','copied')])
    def test_unknown_status(self): self.deny([file('candidates/a','unexpected')])
    def test_malformed_paths(self):
        for p in ['candidates/../.github/x','candidates//x','candidates/./x','candidates/','candidates/a\\b','candidates/a\n','candidates/a\0']:
            with self.subTest(p=p): self.deny([file(p)])
    def test_malformed_previous(self): self.deny([file('candidates/a','renamed',previous_filename='candidates/../eval/x')])
    def test_empty_path(self): self.deny([file('')])
    def test_non_string_path(self): self.deny([file(1)])
    def test_duplicate(self): self.deny([file('candidates/a'),file('candidates/a')])
    def test_empty(self): self.deny([])
    def test_over_limit(self): self.deny([],count=3001)
    def test_invalid_count_type(self): self.deny([],count=True)
    def test_short_page(self): self.deny([file('candidates/a')],count=2)
    def test_long_page(self): self.deny([file('candidates/a'),file('candidates/b')],count=1)
    def test_bad_page_type(self): self.deny([file('candidates/a')],pages=[{}])
    def test_page_boundary(self):
        _,req=self.allow([file(f'candidates/{i}') for i in range(101)]); self.assertEqual(len(req),4)
    def test_page_duplicate(self): self.deny([file(f'candidates/{i}') for i in range(100)]+[file('candidates/0')])
    def test_head_race(self): self.deny([file('candidates/a')],final={'head':{'sha':'c'*40,'ref':'neryx/auto/test'}})
    def test_base_race(self): self.deny([file('candidates/a')],final={'base':{'sha':'c'*40}})
    def test_count_race(self): self.deny([file('candidates/a')],final={'changed_files':2})
    def test_closed(self): self.deny([file('candidates/a')],initial={'state':'closed'})
    def test_ref_mismatch(self): self.deny([file('candidates/a')],initial={'head':{'sha':HEAD,'ref':'other'}})
    def test_http_error(self): self.deny([file('candidates/a')],error=True)
    def test_ordinary_sensitive(self):
        msg,_=self.allow([file('.github/a')],branch='feature/test'); self.assertIn('independent human review',msg); self.assertIn('NOT an independent approval',msg)
    def test_ordinary_normal(self):
        msg,_=self.allow([file('app.js')],branch='feature/test'); self.assertIn('0 sensitive path entries',msg)
    def test_ordinary_rename_sensitive(self):
        msg,_=self.allow([file('app.js','renamed',previous_filename='CODEOWNERS')],branch='feature/test'); self.assertIn('1 sensitive path entries',msg)

if __name__=='__main__': unittest.main(verbosity=2)
