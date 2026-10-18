"""
MiniCompiler — analizador léxico (backend Python).
Reconoce palabras reservadas, identificadores, literales (entero, decimal,
cadena, booleano), operadores aritméticos/relacionales/lógicos, asignación,
delimitadores, puntuación y comentarios.

Cada token incluye tipo, lexema, valor interpretado, línea y columnas.
Detecta caracteres inválidos, números mal formados y cadenas sin cerrar.
"""
from __future__ import annotations
from dataclasses import dataclass
from enum import Enum
from typing import Optional, Union

class TokenType(str, Enum):
    INT = "INT"; FLOAT = "FLOAT"; STRING = "STRING"; BOOL = "BOOL"
    IF = "IF"; ELSE = "ELSE"; WHILE = "WHILE"; PRINT = "PRINT"
    TRUE = "TRUE"; FALSE = "FALSE"
    IDENTIFIER = "IDENTIFIER"
    INTEGER_LITERAL = "INTEGER_LITERAL"; FLOAT_LITERAL = "FLOAT_LITERAL"
    STRING_LITERAL = "STRING_LITERAL"
    PLUS = "PLUS"; MINUS = "MINUS"; MULTIPLY = "MULTIPLY"
    DIVIDE = "DIVIDE"; MODULO = "MODULO"
    ASSIGN = "ASSIGN"
    EQUAL = "EQUAL"; NOT_EQUAL = "NOT_EQUAL"
    LESS_THAN = "LESS_THAN"; LESS_EQUAL = "LESS_EQUAL"
    GREATER_THAN = "GREATER_THAN"; GREATER_EQUAL = "GREATER_EQUAL"
    AND = "AND"; OR = "OR"; NOT = "NOT"
    LEFT_PAREN = "LEFT_PAREN"; RIGHT_PAREN = "RIGHT_PAREN"
    LEFT_BRACE = "LEFT_BRACE"; RIGHT_BRACE = "RIGHT_BRACE"
    SEMICOLON = "SEMICOLON"; COMMA = "COMMA"
    COMMENT = "COMMENT"; EOF = "EOF"

KEYWORDS = {
    "int": TokenType.INT, "float": TokenType.FLOAT,
    "string": TokenType.STRING, "bool": TokenType.BOOL,
    "if": TokenType.IF, "else": TokenType.ELSE, "while": TokenType.WHILE,
    "print": TokenType.PRINT, "true": TokenType.TRUE, "false": TokenType.FALSE,
}

@dataclass
class Token:
    type: TokenType
    lexeme: str
    value: Optional[Union[int, float, str, bool]]
    line: int
    start_column: int
    end_column: int

@dataclass
class LexicalError:
    code: str
    message: str
    line: int
    column: int
    lexeme: str

SINGLE_CHAR = {
    "+": TokenType.PLUS, "-": TokenType.MINUS, "*": TokenType.MULTIPLY,
    "%": TokenType.MODULO, "(": TokenType.LEFT_PAREN, ")": TokenType.RIGHT_PAREN,
    "{": TokenType.LEFT_BRACE, "}": TokenType.RIGHT_BRACE,
    ";": TokenType.SEMICOLON, ",": TokenType.COMMA,
    "=": TokenType.ASSIGN, "<": TokenType.LESS_THAN, ">": TokenType.GREATER_THAN,
    "!": TokenType.NOT,
}
TWO_CHAR = {
    "==": TokenType.EQUAL, "!=": TokenType.NOT_EQUAL,
    "<=": TokenType.LESS_EQUAL, ">=": TokenType.GREATER_EQUAL,
    "&&": TokenType.AND, "||": TokenType.OR,
}

def _is_digit(c: str) -> bool: return c.isdigit()
def _is_alpha(c: str) -> bool: return c.isalpha() or c == "_"
def _is_alnum(c: str) -> bool: return _is_alpha(c) or _is_digit(c)

def tokenize(source: str) -> tuple[list[Token], list[LexicalError]]:
    tokens: list[Token] = []
    errors: list[LexicalError] = []
    i = 0; line = 1; col = 1; n = len(source)

    def err(code: str, msg: str, lex: str, c: int) -> None:
        errors.append(LexicalError(code, msg, line, c, lex))

    while i < n:
        c = source[i]
        if c == "\n":
            i += 1; line += 1; col = 1; continue
        if c in " \t\r":
            i += 1; col += 1; continue
        if c == "/" and i + 1 < n and source[i + 1] == "/":
            start = i; sc = col
            while i < n and source[i] != "\n":
                i += 1; col += 1
            tokens.append(Token(TokenType.COMMENT, source[start:i], None, line, sc, col - 1))
            continue
        if c == '"':
            start = i; sc = col; sl = line; i += 1; col += 1
            value = ""; closed = False
            while i < n:
                ch = source[i]
                if ch == "\\" and i + 1 < n:
                    nxt = source[i + 1]
                    value += {"n": "\n", "t": "\t", '"': '"', "\\": "\\"}.get(nxt, nxt)
                    i += 2; col += 2; continue
                if ch == '"':
                    i += 1; col += 1; closed = True; break
                if ch == "\n": break
                value += ch; i += 1; col += 1
            lex = source[start:i]
            if not closed:
                err("LEX_UNTERMINATED_STRING",
                    "Cadena de texto sin cerrar. Falta la comilla de cierre.", lex, sc)
            tokens.append(Token(TokenType.STRING_LITERAL, lex, value, sl, sc, col - 1))
            continue
        if _is_digit(c):
            start = i; sc = col; sl = line
            while i < n and _is_digit(source[i]):
                i += 1; col += 1
            is_float = False
            if i < n and source[i] == "." and i + 1 < n and _is_digit(source[i + 1]):
                is_float = True; i += 1; col += 1
                while i < n and _is_digit(source[i]):
                    i += 1; col += 1
            elif i < n and source[i] == "." and (i + 1 >= n or not _is_digit(source[i + 1])):
                bad = source[start:i + 1]
                err("LEX_MALFORMED_NUMBER",
                    "Número mal formado: punto decimal sin dígitos decimales.", bad, sc)
                i += 1; col += 1
                tokens.append(Token(TokenType.FLOAT_LITERAL, bad, float(bad), sl, sc, col - 1))
                continue
            lex = source[start:i]
            val = float(lex) if is_float else int(lex)
            tt = TokenType.FLOAT_LITERAL if is_float else TokenType.INTEGER_LITERAL
            tokens.append(Token(tt, lex, val, sl, sc, col - 1))
            continue
        if _is_alpha(c):
            start = i; sc = col; sl = line
            while i < n and _is_alnum(source[i]):
                i += 1; col += 1
            lex = source[start:i]
            if lex in KEYWORDS:
                tt = KEYWORDS[lex]
                val = True if tt == TokenType.TRUE else (False if tt == TokenType.FALSE else None)
                tokens.append(Token(tt, lex, val, sl, sc, col - 1))
            else:
                tokens.append(Token(TokenType.IDENTIFIER, lex, lex, sl, sc, col - 1))
            continue
        two = source[i:i + 2]
        if two in TWO_CHAR:
            tokens.append(Token(TWO_CHAR[two], two, None, line, col, col + 1))
            i += 2; col += 2; continue
        if c in SINGLE_CHAR:
            tokens.append(Token(SINGLE_CHAR[c], c, None, line, col, col))
            i += 1; col += 1; continue
        err("LEX_INVALID_CHAR", f'Carácter inválido "{c}".', c, col)
        i += 1; col += 1

    tokens.append(Token(TokenType.EOF, "", None, line, col, col))
    return tokens, errors
