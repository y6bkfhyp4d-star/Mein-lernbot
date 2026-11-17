import unittest
from check76 import sha, update
class Verify(unittest.TestCase):
    def setUp(self):
        self.db = {'entries':[{'title':'Wasserstoff','excerpt':'Wasserstoff ist ein chemisches Element.'},{'title':'Mars','excerpt':'Mars ist ein Planet.'}]}
        self.fake = lambda title: {'status':'ok','classes':['chemisches Element'] if title=='Wasserstoff' else ['Planet'], 'wikidata_id':'Q1','wikidata_url':'https://www.wikidata.org/wiki/Q1'}
    def test_initial(self):
        res=update(self.db,{},self.fake,'2026-01-01',2)
        self.assertEqual(2,len(res['entities']))
        self.assertEqual(0,len(res['changes']))
    def test_changed(self):
        res=update(self.db,{},self.fake,'2026-01-01',2)
        self.db['entries'][0]['excerpt']='Wasserstoff wurde neu formuliert.'
        new=update(self.db,res,self.fake,'2026-01-02',2)
        self.assertEqual('quelltext_geaendert',new['changes'][0]['type'])
    def test_removed(self):
        res=update(self.db,{},self.fake,'2026-01-01',2)
        new=update({'entries':self.db['entries'][:1]},res,self.fake,'2026-01-02',2)
        self.assertEqual('quelle_entfallen',new['changes'][0]['type'])
    def test_no_change(self):
        res=update(self.db,{},self.fake,'2026-01-01',2)
        new=update(self.db,res,self.fake,'2026-01-02',2)
        self.assertEqual([],new['changes'])
if __name__=='__main__': unittest.main()
