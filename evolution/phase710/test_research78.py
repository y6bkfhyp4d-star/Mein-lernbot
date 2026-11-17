import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
import research78 as r
class Tests(unittest.TestCase):
 def test_extract(self):
  claims,reason=r.candidates('Wasserstoff',{'title':'Wasserstoff','excerpt':'Wasserstoff ist ein chemisches Element mit dem Symbol H.','url':'https://de.wikipedia.org/?curid=4'})
  self.assertEqual(claims[0]['object'],'chemisches Element');self.assertFalse(claims[0]['independent_verified'])
 def test_different_topic(self):
  claims,reason=r.candidates('Wasserstoff',{'title':'Sauerstoff','excerpt':'Sauerstoff ist ein chemisches Element.','url':'https://de.wikipedia.org/?curid=7'})
  self.assertFalse(claims)
 def test_no_negation(self):
  self.assertFalse(r.candidates('Wasserstoff',{'title':'Wasserstoff','excerpt':'Wasserstoff ist nicht ein metallisches Element.','url':'https://de.wikipedia.org/?curid=4'})[0])
 def test_pipeline(self):
  source={'questions':[{'topic':'Wasserstoff','question':'Was ist Wasserstoff?','status':'suchtreffer','hits':[{'title':'Wasserstoff','url':'https://de.wikipedia.org/?curid=4'}]}]}
  f=lambda pid: {'title':'Wasserstoff','excerpt':'Wasserstoff ist ein chemisches Element mit dem Symbol H.','url':'https://de.wikipedia.org/?curid=4'}
  out=r.update(source,{},fetcher=f,now='2026-11-17T00:00:00Z');self.assertEqual(out['runs'][0]['candidates'],1);self.assertEqual(out['verified_corrections'],0)
 def test_search_without_matching_title(self):
  source={'questions':[{'topic':'Wasserstoff','status':'suchtreffer','hits':[{'title':'Wasserstoffauto','url':'https://de.wikipedia.org/?curid=10'}]}]}
  out=r.update(source,{},fetcher=lambda _:self.fail('Should not fetch'),now='now');self.assertEqual(out['records'][0]['status'],'nur_suchtreffer')
if __name__=='__main__':unittest.main()
