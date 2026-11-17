import unittest
from audit712 import analyze
class TestAudit(unittest.TestCase):
 def test_empty(self):
  self.assertEqual(analyze({'records':[]})['checked'],0)
 def test_complete_sentence(self):
  a=analyze({'records':[{'topic':'Licht','claims':[{'statement':'Licht ist eine Form der elektromagnetischen Strahlung.','source':'https://de.wikipedia.org/wiki/Licht'}]}]})
  self.assertEqual(a['findings'],[])
 def test_truncated(self):
  a=analyze({'records':[{'topic':'X','claims':[{'statement':'Ist ein Text','source':'https://de.wikipedia.org/wiki/X'}]}]})
  self.assertTrue(any(f['reason']=='satz_unvollstaendig' for f in a['findings']))
 def test_untrusted_url(self):
  a=analyze({'records':[{'topic':'X','claims':[{'statement':'Eine recht lange Aussage mit ausreichend Zeichen.','source':'http://invalid.example'}]}]})
  self.assertTrue(any(f['reason']=='quelle_fehlt_oder_unerwartet' for f in a['findings']))
 def test_uncertainty(self):
  a=analyze({'records':[{'topic':'X','claims':[{'statement':'Das ist vermutlich eine ausreichend lange Aussage.','source':'https://de.wikipedia.org/wiki/X'}]}]})
  self.assertTrue(any(f['reason']=='unsicherheitsmarker' for f in a['findings']))
if __name__=='__main__':unittest.main()
