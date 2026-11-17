import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
import research710 as r
URL='https://de.wikipedia.org/?curid=80'
def page(t,s,alias=None):return {'title':t,'excerpt':s,'url':URL,'redirect_from':alias}
def response(t,s,alias=None):
    q={'pages':[{'pageid':80,'title':t,'extract':s}]}
    if alias:q['redirects']=[{'from':alias,'to':t}]
    return {'query':q}
class TestResolution(unittest.TestCase):
 def test_direct_exact_lookup_without_search_hit(self):
    src={'questions':[{'topic':'Licht','question':'Was ist Licht?','status':'suchtreffer','hits':[{'title':'Lichttherapie','url':URL}]}]}
    res=r.update(src,{},resolver=lambda topic:(page('Licht','Licht ist eine Form elektromagnetischer Strahlung.'),'direkter_titel'),now='now')
    self.assertEqual(res['runs'][-1]['resolved_without_exact_hit'],1)
    self.assertEqual(res['runs'][-1]['claims'],1)
 def test_title_and_bracket_equivalent(self):
    self.assertTrue(r.is_same_topic('Licht','Licht (Physik)'))
    self.assertFalse(r.is_same_topic('Licht','Lichttherapie'))
 def test_confirmed_redirect(self):
    p,method=r.resolve_topic('DNA',lambda _:response('Desoxyribonukleinsäure','Desoxyribonukleinsäure ist ein Molekül, das Erbinformation trägt.','DNA'))
    self.assertEqual(method,'weiterleitung');self.assertEqual(p['pageid'],80)
    claims,_=r.parse_topic('DNA',p)
    self.assertEqual(len(claims),1)
    self.assertEqual(claims[0]['requested_topic'],'DNA')
 def test_unconfirmed_mismatch_rejected(self):
    p,reason=r.resolve_topic('Licht',lambda _:response('Laser','Laser ist ein technisches Gerät.'))
    self.assertIsNone(p);self.assertEqual(reason,'titel_nicht_bestaetigt')
 def test_missing_page(self):
    p,reason=r.resolve_topic('Licht',lambda _:{'query':{'pages':[{'missing':True,'title':'Licht'}]}})
    self.assertIsNone(p);self.assertEqual(reason,'seite_fehlt_oder_leer')
 def test_incomplete_fragment_still_rejected(self):
    src={'questions':[{'topic':'Licht','status':'suchtreffer','hits':[]}]}
    res=r.update(src,{},resolver=lambda topic:(page('Licht','Licht ist eine Form von'),'direkter_titel'))
    self.assertEqual(res['runs'][-1]['claims'],0)
 def test_no_automatic_verification(self):
    src={'questions':[{'topic':'Evolution','status':'suchtreffer','hits':[]}]}
    res=r.update(src,{},resolver=lambda topic:(page('Evolution','Evolution ist die Veränderung der Merkmale einer Population über Generationen.'),'direkter_titel'))
    self.assertEqual(res['independent_confirmations'],0)
    self.assertFalse(res['records'][0]['claims'][0]['independent_verified'])
 def test_idempotent_records(self):
    src={'questions':[{'topic':'Schall','status':'suchtreffer','hits':[]}]}
    fn=lambda topic:(page('Schall','Schall ist eine mechanische Schwingung in einem Medium.'),'direkter_titel')
    one=r.update(src,{},resolver=fn,now='a');two=r.update(src,one,resolver=fn,now='b')
    self.assertEqual(len(two['records']),1)
 def test_error_provenance(self):
    src={'questions':[{'topic':'Schall','status':'suchtreffer','hits':[]}]}
    def boom(topic):raise TimeoutError()
    res=r.update(src,{},resolver=boom)
    self.assertEqual(res['runs'][-1]['errors'],1)
    self.assertEqual(res['records'][0]['error'],'TimeoutError')
if __name__=='__main__':unittest.main()
