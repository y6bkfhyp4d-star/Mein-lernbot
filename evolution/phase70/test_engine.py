import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import engine

class EngineTests(unittest.TestCase):
    def test_clean_title(self):
        self.assertEqual(engine.clean_title('  Mars  '), 'Mars')
        self.assertEqual(engine.clean_title('Kategorie:Physik'), '')
        self.assertEqual(engine.clean_title(''), '')

    def test_choose_avoids_repeats(self):
        db = {'entries': [{'title': 'Mars'}], 'failed_titles': [], 'discovered_queue': ['Mars', 'Wasser']}
        self.assertEqual(engine.choose_topics(db, {'curated': ['Mars', 'Sonne']}, 3), ['Sonne', 'Wasser'])

    def test_run_with_mocked_web(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with patch.object(engine, 'DB_PATH', root / 'knowledge.json'), patch.object(engine, 'TOPICS_PATH', root / 'topics.json'):
                engine.save_json(root / 'topics.json', {'curated': ['Mars', 'Sonne']})
                def fake_fetch(title):
                    return {'title': title, 'excerpt': 'A' * 120, 'url': 'https://de.wikipedia.org/wiki/' + title, 'links': ['Wasser']}
                r = engine.run(fetcher=fake_fetch, now='2026-11-16T20:00:00+00:00', sleep_fn=lambda _: None)
                self.assertEqual(r['added'], 2)
                db = engine.load_json(root / 'knowledge.json', {})
                self.assertEqual(len(db['entries']), 2)
                self.assertEqual(len(db['discovered_queue']), 1)
                engine.run(fetcher=fake_fetch, now='2026-11-17T20:00:00+00:00', sleep_fn=lambda _: None)
                db = engine.load_json(root / 'knowledge.json', {})
                self.assertEqual(len(db['entries']), 3)
                self.assertEqual(db['entries'][0]['status'], 'eine_quelle_nicht_unabhaengig_verifiziert')

if __name__ == '__main__':
    unittest.main()
