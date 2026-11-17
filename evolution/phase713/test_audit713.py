import unittest
from audit713 import audit,finalize,source_ok,structural_flags,contradiction_pairs,calibrate,HOLDOUT,TRAIN
class TestFinale(unittest.TestCase):
 def test_source_host(self):
  self.assertTrue(source_ok('https://de.wikipedia.org/?curid=1'))
  self.assertFalse(source_ok('https://de.wikipedia.org.evil.net/a'))
 def test_bad_source(self):
  self.assertIn('quelle_ungeeignet',structural_flags('X','Ein kompletter Satz mit genuegend Buchstaben.','http://spam.org'))
 def test_cut_sentence(self):
  self.assertIn('satz_unvollstaendig',structural_flags('X','Licht ist eine Form','https://de.wikipedia.org/wiki/Licht'))
 def test_unknown_truth_not_inferred(self):
  self.assertEqual(structural_flags('Erde','Die Erde besteht vollständig aus würfelförmigem Käse.','https://de.wikipedia.org/wiki/Erde'),[])
 def test_explicit_conflict(self):
  rec=[{'topic':'X','claims':[{'statement':'X ist ein Säugetier.'},{'statement':'X ist kein Säugetier.'}]}]
  self.assertEqual(len(contradiction_pairs(rec)),1)
 def test_no_conflict_without_explicit_negation(self):
  rec=[{'topic':'X','claims':[{'statement':'X ist ein Tier.'},{'statement':'X ist ein Organismus.'}]}]
  self.assertEqual(contradiction_pairs(rec),[])
 def test_audit_real_no_mutation(self):
  rec=[{'topic':'A','claims':[{'statement':'Eine vollständige Angabe zu einem Sachverhalt.','source':'https://de.wikipedia.org/wiki/A'}]}]
  before=repr(rec);a=audit(rec)
  self.assertEqual(before,repr(rec));self.assertEqual(a['checked'],1)
 def test_separation(self):
  x=finalize({'schema':711,'records':[]},now='time')
  self.assertEqual(x['audit']['checked'],0)
  self.assertGreaterEqual(x['checks']['synthetic_holdout']['tested'],10)
  self.assertEqual(x['verified_corrections'],0)
 def test_calibration_train_only(self):
  n,_=calibrate();self.assertIn(n,[25,35,45])
 def test_unverified_explicit(self):
  report=finalize({'schema':711,'records':[{'topic':'Licht','claims':[{'statement':'Licht ist eine Form elektromagnetischer Strahlung.','source':'https://de.wikipedia.org/wiki/Licht'}]}]},now='now')
  self.assertEqual(report['audit']['checked'],1)
  self.assertEqual(report['independent_confirmations'],0)
if __name__=='__main__':unittest.main()
