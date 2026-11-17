import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
import research79 as r
URL='https://de.wikipedia.org/?curid=45'
def page(title,text):return {'title':title,'excerpt':text,'url':URL}
class Tests(unittest.TestCase):
 def test_long_sentence_full(self):
  text='Elektrizität ist der physikalische Oberbegriff für alle Phänomene, die durch ruhende oder bewegte elektrische Ladungen verursacht werden.'
  claims,_=r.parse_claims('Elektrizität',page('Elektrizität',text))
  self.assertEqual(len(claims),1)
  self.assertEqual(claims[0]['statement'],text)
 def test_six_topics(self):
  examples={
   'Chemische Reaktion':'Eine Chemische Reaktion ist ein Vorgang, bei dem aus chemischen Stoffen andere chemische Stoffe entstehen.',
   'Desoxyribonukleinsäure':'Die Desoxyribonukleinsäure ist ein Molekül, das genetische Information trägt.',
   'Elektrizität':'Elektrizität ist der Oberbegriff für elektrische Erscheinungen in der Physik.',
   'Evolution':'Evolution ist die Veränderung vererbbarer Merkmale von Populationen über Generationen.',
   'Licht':'Licht ist eine Form elektromagnetischer Strahlung, die das menschliche Auge wahrnehmen kann.',
   'Schall':'Schall ist eine mechanische Schwingung, die sich in einem Medium ausbreitet.'}
  for name,s in examples.items():
   with self.subTest(name=name):self.assertGreater(len(r.parse_claims(name,page(name,s))[0]),0)
 def test_no_fragment(self):
  self.assertEqual(r.parse_claims('Elektrizität',page('Elektrizität','Elektrizität ist der physikalische Oberbegriff für alle Phänomene'))[0],[])
 def test_uncertain(self):
  self.assertEqual(r.parse_claims('Evolution',page('Evolution','Evolution ist angeblich eine Veränderung der Arten.'))[0],[])
 def test_mismatch(self):
  self.assertEqual(r.parse_claims('Licht',page('Laser','Licht ist eine Form von Strahlung.'))[0],[])
 def test_comparison_and_provenance(self):
  src={'questions':[{'topic':'Licht','question':'Was ist Licht?','status':'suchtreffer','hits':[{'title':'Licht','url':'https://de.wikipedia.org/?curid=45'}]}]}
  out=r.update(src,{},fetcher=lambda pid:page('Licht','Licht ist eine Form elektromagnetischer Strahlung.'),now='2026-11-17T00:00:00Z')
  self.assertEqual(out['runs'][-1]['with_claims'],1)
  self.assertFalse(out['records'][0]['claims'][0]['independent_verified'])
  self.assertIn('baseline_topics_same_pages',out['runs'][-1])
 def test_nonexact_hit_not_used(self):
  src={'questions':[{'topic':'Licht','status':'suchtreffer','hits':[{'title':'Lichttherapie','url':'https://de.wikipedia.org/?curid=45'}]}]}
  out=r.update(src,{},fetcher=lambda pid:self.fail('should not fetch'),now='now')
  self.assertEqual(out['records'][0]['status'],'kein_passender_titel')
 def test_idempotent(self):
  src={'questions':[{'topic':'Schall','status':'suchtreffer','hits':[{'title':'Schall','url':'https://de.wikipedia.org/?curid=45'}]}]}
  fetch=lambda pid:page('Schall','Schall ist eine mechanische Schwingung in einem Medium.')
  a=r.update(src,{},fetcher=fetch,now='a');b=r.update(src,a,fetcher=fetch,now='b')
  self.assertEqual(len(b['records']),1)
if __name__=='__main__':unittest.main()
