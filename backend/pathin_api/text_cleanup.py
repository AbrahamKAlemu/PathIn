from __future__ import annotations

import re
import unicodedata


_CONTROL_CHARACTERS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_INVISIBLE_CHARACTERS = re.compile(r"[\u00ad\u200b-\u200d\u2060\ufeff]")
_MULTI_SPACE_BOUNDARY = re.compile(r"[ \t]{2,}")
_TOKEN = re.compile(r"[A-Za-z0-9]+|[^\w\s]", re.UNICODE)
_CAMEL_ACRONYM_BOUNDARY = re.compile(r"([A-Z]+)([A-Z][a-z])")
_CAMEL_WORD_BOUNDARY = re.compile(r"([a-z0-9])([A-Z])")
_SPLIT_YEAR = re.compile(r"\b[12](?:\s*\d){3}\b")
_MONTH_YEAR = re.compile(
    r"\b("
    r"Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|"
    r"Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|"
    r"Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?"
    r")(\d{4})\b",
    re.IGNORECASE,
)
_DATE_RANGE = re.compile(
    r"(\b(?:"
    r"Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|"
    r"Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|"
    r"Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?"
    r")\s+\d{4})\s*[-\u2013\u2014]\s*"
    r"(Present|(?:"
    r"Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|"
    r"Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|"
    r"Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?"
    r")\s+\d{4})\b",
    re.IGNORECASE,
)
_COMPACTED_ALPHA_TOKEN = re.compile(r"[A-Za-z]{36,}")
_CAMEL_TOKEN = re.compile(r"\b[A-Za-z][A-Za-z0-9]{5,}\b")


def _collapse_character_spaced_segment(segment: str) -> str:
    tokens = _TOKEN.findall(segment)
    alphanumeric = [token for token in tokens if token.isalnum()]
    if (
        len(alphanumeric) >= 2
        and all(len(token) == 1 for token in alphanumeric)
    ):
        return "".join(tokens)
    return segment


def _split_compacted_camel_token(match: re.Match[str]) -> str:
    token = match.group(0)
    boundary_count = len(_CAMEL_ACRONYM_BOUNDARY.findall(token)) + len(
        _CAMEL_WORD_BOUNDARY.findall(token)
    )
    if boundary_count < 2 and len(token) < 28:
        return token
    token = _CAMEL_ACRONYM_BOUNDARY.sub(r"\1 \2", token)
    return _CAMEL_WORD_BOUNDARY.sub(r"\1 \2", token)


def _collapse_split_year(match: re.Match[str]) -> str:
    value = match.group(0)
    digits = re.sub(r"\s+", "", value)
    year = int(digits)
    return digits if len(digits) == 4 and 1900 <= year <= 2099 else value


def clean_profile_text(value: str) -> str:
    text = unicodedata.normalize("NFKC", str(value))
    text = _CONTROL_CHARACTERS.sub(" ", text)
    text = _INVISIBLE_CHARACTERS.sub("", text)
    text = (
        text.replace("\u00a0", " ")
        .replace("\u2007", " ")
        .replace("\u202f", " ")
    )

    pieces = _MULTI_SPACE_BOUNDARY.split(text)
    text = " ".join(
        cleaned
        for cleaned in (
            _collapse_character_spaced_segment(piece.strip())
            for piece in pieces
        )
        if cleaned
    )

    text = re.sub(r"\s*\|\s*", " | ", text)
    text = _CAMEL_TOKEN.sub(_split_compacted_camel_token, text)
    text = _SPLIT_YEAR.sub(_collapse_split_year, text)
    text = _MONTH_YEAR.sub(r"\1 \2", text)
    text = _DATE_RANGE.sub(r"\1 - \2", text)
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    text = re.sub(r"([,;:])(?=\S)", r"\1 ", text)
    return re.sub(r"\s+", " ", text).strip()


def clean_extracted_text(value: str, *, max_characters: int) -> str:
    cleaned_lines: list[str] = []
    for raw_line in str(value).replace("\r", "\n").splitlines():
        line = clean_profile_text(raw_line)
        if line:
            cleaned_lines.append(line)
    cleaned = "\n".join(cleaned_lines)
    return _SPLIT_YEAR.sub(_collapse_split_year, cleaned)[:max_characters]


def is_probably_compacted_text(value: str) -> bool:
    cleaned = clean_profile_text(value)
    return bool(
        _COMPACTED_ALPHA_TOKEN.search(cleaned)
        or (
            len(cleaned) >= 80
            and " " not in cleaned
            and sum(character.isalpha() for character in cleaned)
            / max(len(cleaned), 1)
            >= 0.8
        )
    )


def extraction_quality(value: str) -> int:
    cleaned = clean_extracted_text(value, max_characters=250_000)
    useful_words = [
        token
        for token in re.findall(r"[A-Za-z][A-Za-z0-9+#./-]*", cleaned)
        if 2 <= len(token) <= 35
    ]
    compacted_penalty = len(_COMPACTED_ALPHA_TOKEN.findall(cleaned)) * 80
    line_bonus = min(len(cleaned.splitlines()), 80)
    return len(useful_words) * 4 + line_bonus - compacted_penalty


def compact_profile_text(
    value: str,
    *,
    max_characters: int,
    fallback: str,
) -> str:
    cleaned = clean_profile_text(value)
    if not cleaned or is_probably_compacted_text(cleaned):
        return fallback
    if len(cleaned) <= max_characters:
        return cleaned
    cutoff = cleaned.rfind(" ", 0, max_characters - 3)
    if cutoff < max_characters // 2:
        cutoff = max_characters - 3
    return f"{cleaned[:cutoff].rstrip()}..."
