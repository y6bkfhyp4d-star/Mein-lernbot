import unittest
import research77 as r

class FollowupTests(unittest.TestCase):
    def setUp(self):
        self.db={'entries':[{'title':'Wasserstoff','excerpt':'Wasserstoff ist ein chemisches Element.','source':'https://de.wikipedia.org/wiki/Wasserstoff'},{'title':'Licht','excerpt':'Licht ist eine Form elektromagnetischer Strahlung.','source':'https://de.wikipedia.org/wiki/Licht'}]}
    def test_questions_are_generated(self):
        q=r.choose_gaps(self.db,{},{}); self.assertEqual(len(q),2); self.assertTrue(all(x['question'].endswith('?') for x in q))
    def test_queries_are_logged_no_auto_truth(self):
        result=r.update(self.db,{}, {}, fetcher=lambda q:[{'title':'Titel','url':'https://de.wikipedia.org/?curid=42','snippet':'Text'}],now='2026-01-01T00:00:00+00:00')
        self.assertEqual(result['runs'][-1]['with_results'],2)
        self.assertEqual(result['independent_confirmations'],0)
        self.assertTrue(all(x['independent_confirmation'] is False for x in result['questions']))
    def test_error_is_not_confirmation(self):
        def bad(q): raise RuntimeError('offline')
        result=r.update(self.db,{}, {}, fetcher=bad, now='2026-01-01T00:00:00+00:00')
        self.assertEqual(result['runs'][-1]['errors'],2)
        self.assertTrue(all(x['status']=='recherche_fehler' for x in result['questions']))
    def test_repeated_run_keeps_unique_topics(self):
        first=r.update(self.db,{}, {}, fetcher=lambda q:[],now='t1')
        second=r.update(self.db,first,{},fetcher=lambda q:[],now='t2')
        self.assertEqual(len(second['questions']),2)
        self.assertEqual(len(second['runs']),2)
    def test_invalid_search_links_are_rejected(self):
        r1=r.update(self.db,{}, {},fetcher=lambda q:[{'url':'https://evil.example','title':'fake'}],now='t')
        self.assertEqual(r1['runs'][-1]['with_results'],0)

if __name__=='__main__': unittest.main()
