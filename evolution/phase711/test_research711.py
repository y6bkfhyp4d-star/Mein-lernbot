import unittest
from research711 import parse_flexible,update,find_subject_start

class FlexibleTests(unittest.TestCase):
    def page(self, topic, sentence):
        return {'title':topic,'excerpt':sentence,'url':'https://de.wikipedia.org/?curid=1','pageid':1}
    def test_direct(self):
        p=self.page('Elektrizität','Elektrizität ist der physikalische Oberbegriff für alle Phänomene der Ladung.')
        result,status,_=parse_flexible('Elektrizität',p)
        self.assertEqual(len(result),1)
        self.assertIn('Phänomene',result[0]['statement'])
    def test_intro(self):
        p=self.page('Evolution','In der Biologie ist Evolution ein Begriff für die Veränderung von Arten.')
        # This order is intentionally unsupported; do not accept invalid subject attribution.
        self.assertEqual(parse_flexible('Evolution',p)[0],[])
    def test_intro_subject(self):
        p=self.page('Evolution','In der Biologie bezeichnet Evolution die Veränderung von Populationen.')
        self.assertEqual(parse_flexible('Evolution',p)[0],[])
    def test_definitional(self):
        p=self.page('Evolution','Unter Evolution versteht man die Veränderung vererbbarer Merkmale in Populationen über Generationen.')
        claims,status,_=parse_flexible('Evolution',p)
        self.assertEqual(len(claims),1)
    def test_alias(self):
        p=self.page('Desoxyribonukleinsäure','Die DNA ist ein Molekül zur Speicherung genetischer Information.')
        self.assertEqual(len(parse_flexible('Desoxyribonukleinsäure',p)[0]),1)
    def test_parenthesis(self):
        p=self.page('Desoxyribonukleinsäure','Die Desoxyribonukleinsäure (kurz DNS) ist ein Molekül, das Erbinformation speichert.')
        self.assertEqual(len(parse_flexible('Desoxyribonukleinsäure',p)[0]),1)
    def test_uncertain(self):
        p=self.page('Evolution','Die Evolution ist angeblich ein umstrittenes Thema in der Forschung.')
        self.assertEqual(len(parse_flexible('Evolution',p)[0]),0)
    def test_no_arbitrary_mid_sentence(self):
        p=self.page('Licht','In einem historischen Buch wurde Licht als seltsames Phänomen bezeichnet.')
        self.assertEqual(len(parse_flexible('Licht',p)[0]),0)
    def test_missing_period(self):
        p=self.page('Licht','Licht ist eine Form elektromagnetischer Strahlung')
        self.assertEqual(len(parse_flexible('Licht',p)[0]),0)
    def test_no_false_confirmation(self):
        source={'questions':[{'topic':'Licht','status':'suchtreffer','question':'Was ist Licht?'}]}
        def fake(t):return self.page(t,'Licht ist eine Form elektromagnetischer Strahlung.'),'direkter_titel'
        d=update(source,{},fake,'2026-01-01',6)
        self.assertEqual(d['runs'][-1]['claims'],1)
        self.assertEqual(d['independent_confirmations'],0)
        self.assertEqual(d['verified_corrections'],0)
    def test_stable_counts(self):
        source={'questions':[{'topic':'Licht','status':'suchtreffer','question':'Was ist Licht?'}]}
        def fake(t):return self.page(t,'Licht ist eine Form elektromagnetischer Strahlung.'),'direkter_titel'
        d=update(source,{},fake,'2026-01-01')
        d=update(source,d,fake,'2026-01-02')
        self.assertEqual(len(d['records']),1)
        self.assertEqual(len(d['runs']),2)
        self.assertEqual(d['runs'][-1]['topics_with_claims'],1)

if __name__=='__main__':unittest.main()
