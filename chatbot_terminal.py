#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mein lernender Chatbot – Python-Version für a-Shell (iPhone) und normale Terminals.
Benötigt nur die Python-Standardbibliothek. Keine Internetverbindung nötig.

Start in a-Shell:
    python3 chatbot.py
"""

from __future__ import annotations

import json
import math
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

APP_NAME = "Mein lernender Chatbot"
VERSION = "2.0"
DATA_DIR = Path(__file__).resolve().parent
KNOWLEDGE_FILE = DATA_DIR / "lernbot_wissen.json"
HISTORY_FILE = DATA_DIR / "lernbot_verlauf.json"

SEED = [
    ("Hallo Hi Guten Tag", "Hallo! Schön, dass du da bist. Tippe „hilfe“, um zu sehen, was ich kann."),
    ("Notfall", "Bei akuter Gefahr zuerst 112 anrufen (Rettungsdienst und Feuerwehr). Polizei: 110. Nenne zuerst den genauen Ort und beschreibe kurz, was passiert ist. Stelle das Telefon auf Lautsprecher und befolge die Anweisungen der Leitstelle. Ich bin kein Ersatz für den Notruf."),
    ("Notruf Nummer Polizei Feuerwehr Krankenwagen", "112: Rettungsdienst und Feuerwehr. 110: Polizei. 116 117: ärztlicher Bereitschaftsdienst bei dringenden, nicht lebensbedrohlichen Beschwerden. Bei unmittelbarer Lebensgefahr immer 112."),
    ("Herzstillstand Wiederbelebung Reanimation", "Bei Bewusstlosigkeit und keiner normalen Atmung sofort 112 wählen, Lautsprecher einschalten und den Anweisungen der Leitstelle folgen. Beginne unverzüglich mit Wiederbelebung, wenn du dazu aufgefordert wirst oder entsprechend geschult bist. Einen AED holen lassen und dessen Sprachanweisungen befolgen."),
    ("Bewusstlos Seitenlage", "Bei Bewusstlosigkeit sofort 112 rufen und die Atmung prüfen. Atmet die Person normal, bringe sie – sofern keine Verletzung dagegenspricht – in die stabile Seitenlage und kontrolliere die Atmung weiter. Bei fehlender oder nicht normaler Atmung: 112 und Wiederbelebung nach Anleitung der Leitstelle."),
    ("Blutung Wunde blutet", "Bei starker Blutung sofort 112 rufen und mit einem sauberen Tuch oder Verband direkten, festen Druck auf die Wunde ausüben. Die Anweisungen der Leitstelle befolgen."),
    ("Verbrennung verbrannt Verbrühung", "Bei einer Verbrennung die Stelle von der Hitzequelle entfernen und Schmuck oder nicht festgeklebte Kleidung vorsichtig abnehmen. Keine Eiswürfel, Hausmittel oder Salben verwenden. Bei größeren, tiefen oder kritischen Verbrennungen sowie bei Atemproblemen 112 rufen. Folge den Anweisungen der Leitstelle."),
    ("Schlaganfall", "Mögliche Zeichen: plötzlich hängender Mundwinkel, Schwäche oder Taubheit auf einer Seite, Sprach- oder Sehstörungen. Sofort 112 rufen und den Zeitpunkt merken, zu dem die Symptome begonnen haben. Nichts essen oder trinken geben."),
    ("Herzinfarkt Brustschmerzen", "Bei Verdacht auf Herzinfarkt – zum Beispiel Druck oder Schmerzen in der Brust, Atemnot, kalter Schweiß oder Übelkeit – sofort 112 rufen. Die Person nicht allein lassen und den Anweisungen der Leitstelle folgen."),
    ("Verschluckt Ersticken", "Bei schwerer Atemwegsverlegung sofort 112 rufen und die Anweisungen der Leitstelle befolgen. Erste-Hilfe-Maßnahmen unterscheiden sich unter anderem nach Alter und Situation. Wenn die Person noch kräftig husten kann, zum Husten ermutigen."),
    ("Vergiftung vergiftet Gift", "Kein Erbrechen auslösen und keine Hausmittel geben. Verpackung oder Stoff bereithalten. Bei Bewusstlosigkeit, Krämpfen, Atemnot oder akuter Gefahr 112 rufen. Bei unklarer Vergiftung ohne schwere Symptome ein Giftinformationszentrum kontaktieren."),
    ("Allergie allergischer Schock", "Bei Atemnot, Schwellungen im Mund- oder Rachenraum oder Kreislaufproblemen sofort 112 rufen. Ein verordnetes Notfallset nach dessen Anleitung anwenden. Die Person nicht allein lassen und den Anweisungen der Leitstelle folgen."),
    ("Brand Feuer brennt", "Menschen warnen, Gebäude verlassen, Türen hinter sich schließen und keinen Aufzug benutzen. Von draußen 112 rufen. Bei Rauch möglichst niedrig bleiben. Nur löschen, wenn das gefahrlos möglich ist. Brennendes Fett niemals mit Wasser löschen."),
    ("Hitzschlag Hitze", "Bei Verdacht auf Hitzschlag – etwa Verwirrtheit, Bewusstseinsstörung oder sehr heißem Körper – sofort 112 rufen. Die Person aus der Hitze bringen und mit geeigneten Maßnahmen kühlen, während du den Anweisungen der Leitstelle folgst."),
    ("Unterkühlung Kälte", "Die Person vorsichtig aus der Kälte bringen, vor weiterer Auskühlung schützen und nasse Kleidung möglichst schonend entfernen. Nicht kräftig rubbeln und keine starke direkte Hitze anwenden. Bei Bewusstseinsstörung oder schwerer Unterkühlung 112 rufen."),
    ("Unfall Verkehrsunfall", "Eigenschutz zuerst: Warnblinker einschalten, Warnweste anziehen und die Unfallstelle nur gefahrlos absichern. 112 rufen, Verletzten helfen und den Anweisungen der Leitstelle folgen."),
    ("Telefonseelsorge Suizid Selbstmord Verzweiflung traurig", "Wenn du gerade daran denkst, dir etwas anzutun, bleib bitte nicht allein und wende dich jetzt an eine vertraute Person. Die TelefonSeelsorge in Deutschland erreichst du kostenlos unter 0800 111 0 111, 0800 111 0 222 oder 116 123. Bei unmittelbarer Gefahr: 112."),
    ("Gewalt Hilfetelefon", "Bei akuter Gefahr die Polizei unter 110 rufen. Das Hilfetelefon „Gewalt gegen Frauen“ erreichst du in Deutschland unter 116 016. Kinder und Jugendliche können sich an die Nummer gegen Kummer unter 116 111 wenden."),
    ("Missbrauch Hilfetelefon", "Das Hilfe-Telefon Sexueller Missbrauch in Deutschland ist unter 0800 22 55 530 erreichbar. Bei unmittelbarer Gefahr die Polizei unter 110 oder den Rettungsdienst unter 112 rufen."),
    ("Wer bist du Was kannst du", "Ich bin ein lokaler Lern-Chatbot. Ich speichere Wissen auf diesem Gerät und kann aus deinen Eingaben lernen. Ich habe kein eigenes Internet und kann Fehler machen. Bei medizinischen Notfällen immer 112.")
]

STOP_WORDS = set("""
der die das den dem des ein eine einen einem einer ist sind war waren
was wer wie wo wann und oder von zu in im am an auf für mit ich du es
mir dir wir ihr sie bitte mal denn also kennst weißt kannst kann sag
sage ist das den ein einer einer? mein meine deiner deiner
""".split())

SUICIDE_RE = re.compile(
    r"\b(selbstmord|suizid|umbringen|nicht mehr leben|sterben (?:will|möchte)|"
    r"töten will|ritzen|selbstverletz)\b", re.IGNORECASE
)


def normalize(text: str) -> str:
    text = text.casefold()
    text = re.sub(r"[^\w\säöüß]", " ", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip()


def tokens(text: str) -> list[str]:
    result = []
    for word in normalize(text).split():
        if word in STOP_WORDS or len(word) < 2:
            continue
        # Kleine, bewusst vorsichtige Endungsnormalisierung.
        if len(word) > 6:
            for suffix in ("ern", "en", "er", "es", "e", "n", "s"):
                if word.endswith(suffix) and len(word) - len(suffix) >= 4:
                    word = word[:-len(suffix)]
                    break
        result.append(word)
    return result


def char_ngrams(text: str, n: int = 3) -> list[str]:
    text = " " + normalize(text) + " "
    if len(text) < n:
        return [text] if text.strip() else []
    return [text[i:i+n] for i in range(len(text) - n + 1)]


def counts(items: list[str]) -> dict[str, int]:
    out: dict[str, int] = {}
    for item in items:
        out[item] = out.get(item, 0) + 1
    return out


def cosine(a: dict[str, int], b: dict[str, int]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(value * b.get(key, 0) for key, value in a.items())
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


def similarity(left: str, right: str) -> float:
    word_score = cosine(counts(tokens(left)), counts(tokens(right)))
    char_score = cosine(counts(char_ngrams(left)), counts(char_ngrams(right)))
    # Worttreffer zählen stärker; Zeichenähnlichkeit hilft bei Schreibvarianten.
    return 0.68 * word_score + 0.32 * char_score


class LearningBot:
    def __init__(self) -> None:
        self.qa: list[dict] = []
        self.classes: list[dict] = []
        self.history: list[dict] = []
        self.pending: Optional[str] = None
        self.load()
        self.seed_if_needed()

    def load(self) -> None:
        try:
            data = json.loads(KNOWLEDGE_FILE.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                self.qa = data.get("qa", []) if isinstance(data.get("qa", []), list) else []
                self.classes = data.get("classes", []) if isinstance(data.get("classes", []), list) else []
                self.pending = data.get("pending")
        except FileNotFoundError:
            pass
        except (json.JSONDecodeError, OSError, TypeError):
            print("Hinweis: Die Wissensdatei konnte nicht gelesen werden. Ich starte mit leerem Wissen.")

        try:
            data = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
            self.history = data if isinstance(data, list) else []
        except (FileNotFoundError, json.JSONDecodeError, OSError):
            self.history = []

    @staticmethod
    def atomic_write(path: Path, content: str) -> None:
        temp = path.with_suffix(path.suffix + ".tmp")
        temp.write_text(content, encoding="utf-8")
        temp.replace(path)

    def save(self) -> None:
        data = {
            "version": VERSION,
            "qa": self.qa,
            "classes": self.classes,
            "pending": self.pending,
        }
        self.atomic_write(KNOWLEDGE_FILE, json.dumps(data, ensure_ascii=False, indent=2))
        self.atomic_write(HISTORY_FILE, json.dumps(self.history[-200:], ensure_ascii=False, indent=2))

    def seed_if_needed(self) -> None:
        if not KNOWLEDGE_FILE.exists():
            self.add_seed()
        else:
            # Neue Grundwissen-Einträge ergänzen, ohne eigene Einträge zu überschreiben.
            known = {normalize(x.get("k", "")) for x in self.qa}
            added = False
            for question, answer in SEED:
                if normalize(question) not in known:
                    self.qa.append({"k": question, "a": answer, "source": "grundwissen"})
                    added = True
            if added:
                self.save()

    def add_seed(self) -> int:
        known = {normalize(x.get("k", "")) for x in self.qa}
        added = 0
        for question, answer in SEED:
            if normalize(question) not in known:
                self.qa.append({"k": question, "a": answer, "source": "grundwissen"})
                known.add(normalize(question))
                added += 1
        self.save()
        return added

    def best_match(self, query: str) -> tuple[Optional[int], float]:
        if not self.qa:
            return None, 0.0
        best_index, best_score = None, 0.0
        for index, item in enumerate(self.qa):
            score = similarity(query, item.get("k", ""))
            if score > best_score:
                best_index, best_score = index, score
        return best_index, best_score

    def learn_pair(self, question: str, answer: str) -> str:
        question, answer = question.strip(), answer.strip()
        if not question or not answer:
            return "Frage und Antwort dürfen nicht leer sein."
        index, score = self.best_match(question)
        if index is not None and score >= 0.94:
            old = self.qa[index]
            old["k"], old["a"], old["source"] = question, answer, "user"
            self.save()
            return "Vorhandenen Eintrag aktualisiert."
        self.qa.append({"k": question, "a": answer, "source": "user"})
        self.save()
        return f"Gelernt! Ich habe jetzt {len(self.qa)} Wissenseinträge."

    def classify(self, text: str) -> str:
        if not self.classes:
            return "Noch keine Kategorien vorhanden. Beispiel:\nlerne kategorie Tier: Der Hund bellt"
        grouped: dict[str, list[str]] = {}
        for example in self.classes:
            grouped.setdefault(example["c"], []).append(example["t"])
        if len(grouped) < 2:
            return "Für eine Einordnung brauche ich Beispiele aus mindestens zwei Kategorien."
        query_tokens = tokens(text)
        if not query_tokens:
            return "Damit kann ich nichts anfangen."

        vocab = set()
        for examples in grouped.values():
            for example in examples:
                vocab.update(tokens(example))
        vocab_size = max(1, len(vocab))
        total = sum(len(examples) for examples in grouped.values())
        scores = []
        for category, examples in grouped.items():
            prior = math.log(len(examples) / total)
            word_counts: dict[str, int] = {}
            total_words = 0
            for example in examples:
                for word in tokens(example):
                    word_counts[word] = word_counts.get(word, 0) + 1
                    total_words += 1
            score = prior
            for word in query_tokens:
                score += math.log((word_counts.get(word, 0) + 0.5) /
                                  (total_words + 0.5 * (vocab_size + 1)))
            scores.append((category, score / math.sqrt(len(query_tokens))))
        scores.sort(key=lambda item: item[1], reverse=True)
        # Relative Werte als Orientierung, nicht als verlässliche KI-Wahrscheinlichkeit.
        peak = scores[0][1]
        weights = [math.exp(max(-30, (score - peak) * 2.5)) for _, score in scores]
        total_weight = sum(weights) or 1
        first = f"Ich tippe auf: {scores[0][0]} ({round(weights[0] / total_weight * 100)} %)"
        if len(scores) > 1:
            first += f"\nDanach: {scores[1][0]} ({round(weights[1] / total_weight * 100)} %)"
        return first + "\nDie Prozentwerte sind nur grobe Vergleichswerte."

    def remember_category(self, category: str, example: str) -> str:
        category, example = category.strip(), example.strip()
        if not category or not example:
            return "Kategorie und Beispiel dürfen nicht leer sein."
        self.classes.append({"c": category, "t": example})
        self.save()
        return f"Gespeichert: „{example}“ gehört zu „{category}“."

    def handle(self, raw: str) -> str:
        text = raw.strip()
        low = text.casefold()
        if not text:
            return "Schreib zuerst eine Nachricht."

        if SUICIDE_RE.search(text):
            self.pending = None
            self.save()
            return ("Das klingt ernst. Bitte bleib damit nicht allein und sprich jetzt mit einer "
                    "vertrauten Person. Die TelefonSeelsorge in Deutschland erreichst du kostenlos "
                    "unter 0800 111 0 111, 0800 111 0 222 oder 116 123. Bei unmittelbarer Gefahr "
                    "ruf 112. Wenn du magst, kannst du mir sagen, ob du gerade in Sicherheit bist.")

        if self.pending:
            question = self.pending
            if low in {"abbrechen", "egal", "nein", "stop", "lass es"}:
                self.pending = None
                self.save()
                return "Okay, ich lerne dazu nichts."
            self.pending = None
            result = self.learn_pair(question, text)
            return result + f"\nAuf „{question}“ werde ich künftig so antworten: „{text}“"

        if low in {"hilfe", "help", "?"}:
            return HELP_TEXT
        if low in {"beenden", "exit", "quit"}:
            return "__EXIT__"
        if low == "grundwissen laden":
            added = self.add_seed()
            return f"Grundwissen geprüft: {added} neue Einträge ergänzt."
        if low == "verlauf":
            if not self.history:
                return "Der Gesprächsverlauf ist leer."
            lines = []
            for item in self.history[-20:]:
                who = "Du" if item.get("role") == "user" else "Bot"
                lines.append(f"{who}: {item.get('text', '')}")
            return "\n".join(lines)
        if low == "verlauf löschen":
            self.history.clear()
            self.save()
            return "Gesprächsverlauf gelöscht. Dein gelerntes Wissen bleibt erhalten."
        if low == "was weißt du?" or low.startswith(("was weißt du", "was hast du gelernt", "zeig gelernt")):
            if not self.qa and not self.classes:
                return "Noch nichts gelernt. Tippe „hilfe“, um Beispiele zu sehen."
            result = ""
            if self.qa:
                result = "Wissenseinträge:\n" + "\n".join(
                    f"• {x.get('k', '')} → {x.get('a') or '(nur gemerkt)'}"
                    for x in self.qa[-100:]
                )
            if self.classes:
                cats = sorted({x.get("c", "") for x in self.classes})
                result += f"\n\nKategorie-Beispiele: {len(self.classes)} ({', '.join(cats)})"
            return result

        match = re.match(r"^(?:lerne|lern|merk dir|merke dir|speichere)\s*:?\s+(.+)$", text, re.I)
        if match:
            body = match.group(1).strip()
            category_match = re.match(r"^kategorie\s+([^:]+?)\s*:\s*(.+)$", body, re.I)
            if category_match:
                return self.remember_category(category_match.group(1), category_match.group(2))
            pair_match = re.match(r"^(.+?)\s*(?:=>|->|=)\s*(.+)$", body)
            if pair_match:
                return self.learn_pair(pair_match.group(1), pair_match.group(2))
            self.qa.append({"k": body, "a": None, "source": "user"})
            self.save()
            return "Okay, gemerkt. Du kannst mir auch direkt eine Antwort beibringen:\nlerne: Frage = Antwort"

        match = re.match(r"^(?:ordne ein|einordnen|kategorie\?)\s*:?\s*(.+)$", text, re.I)
        if match:
            return self.classify(match.group(1))

        if low == "vergiss alles":
            return "Möchtest du wirklich dein gesamtes gelerntes Wissen löschen? Tippe zur Bestätigung: JA, ALLES LÖSCHEN"
        if low == "ja, alles löschen":
            self.qa.clear()
            self.classes.clear()
            self.pending = None
            self.save()
            return "Gelerntes Wissen und Kategorien gelöscht. Der Gesprächsverlauf bleibt erhalten."

        match = re.match(r"^vergiss\s*:?\s+(.+)$", text, re.I)
        if match:
            index, score = self.best_match(match.group(1))
            if index is None or score < 0.28:
                return "Dazu finde ich keinen passenden Eintrag."
            removed = self.qa.pop(index)
            self.save()
            return f"Vergessen: „{removed.get('k', '')}“"

        index, score = self.best_match(text)
        if index is not None and score >= 0.34:
            item = self.qa[index]
            answer = item.get("a") or f"Das habe ich mir gemerkt: {item.get('k', '')}"
            if score < 0.43:
                return "Ich bin nicht ganz sicher, ob du das meinst. Vielleicht hilft dir das:\n" + answer
            return answer

        self.pending = text
        self.save()
        return "Das weiß ich noch nicht. Wie soll ich darauf antworten?\nSchreib die Antwort oder „abbrechen“."

    def chat(self) -> None:
        print(f"\n{APP_NAME} v{VERSION}")
        print("Lokal auf deinem Gerät · keine Zusatzpakete · tippe „hilfe“ für Befehle")
        print("Dateien:", KNOWLEDGE_FILE.name, "und", HISTORY_FILE.name)
        print("-" * 56)
        if not self.history:
            print("Bot: Hallo! Bring mir etwas bei oder stelle mir eine Frage.")
        while True:
            try:
                user_text = input("\nDu: ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\nBis später!")
                self.save()
                break
            if not user_text:
                continue

            answer = self.handle(user_text)
            self.history.append({"role": "user", "text": user_text,
                                 "time": datetime.now().isoformat(timespec="seconds")})
            if answer == "__EXIT__":
                self.save()
                print("Bot: Bis später!")
                break
            self.history.append({"role": "bot", "text": answer,
                                 "time": datetime.now().isoformat(timespec="seconds")})
            self.history = self.history[-200:]
            self.save()
            print("\nBot: " + answer)


HELP_TEXT = """So bringst du mir etwas bei:

• lerne: Die Hauptstadt von Frankreich = Paris
  Speichert eine Frage mit einer festen Antwort.
• lerne: Quantenphysik
  Merkt sich einen Begriff oder Fakt ohne Antwort.
• lerne kategorie Tier: Der Hund bellt
  Fügt ein Beispiel für eine Kategorie hinzu.
• ordne ein: Das Pferd galoppiert
  Ordnet einen Text anhand deiner Beispiele ein.
• grundwissen laden
  Ergänzt das eingebaute Grundwissen.
• was weißt du?
  Zeigt deine Wissenseinträge und Kategorien.
• vergiss: Paris
  Entfernt den ähnlichsten Wissenseintrag.
• verlauf / verlauf löschen
  Zeigt oder löscht den Chatverlauf.
• beenden
  Beendet den Chatbot.

Hinweis: Der Bot arbeitet lokal und hat kein echtes Weltwissen oder Internet.
Seine Ähnlichkeitssuche ist einfach und kann Fragen falsch zuordnen.
Notfallantworten sind nur Orientierung – bei akuter Gefahr 112 wählen."""


def main() -> None:
    try:
        LearningBot().chat()
    except OSError as exc:
        print(f"Dateifehler: {exc}", file=sys.stderr)
        print("Prüfe, ob a-Shell Schreibzugriff auf diesen Ordner hat.", file=sys.stderr)


if __name__ == "__main__":
    main()
