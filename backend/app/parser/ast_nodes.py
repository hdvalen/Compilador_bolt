"""AST node definitions for MiniCompiler (backend)."""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, Union, Any

DataType = str  # "int" | "float" | "string" | "bool"

@dataclass
class Node:
    line: int = 0
    column: int = 0

@dataclass
class IntegerLiteral(Node):
    value: int = 0
    node_type: str = "IntegerLiteral"
@dataclass
class FloatLiteral(Node):
    value: float = 0.0
    node_type: str = "FloatLiteral"
@dataclass
class StringLiteral(Node):
    value: str = ""
    node_type: str = "StringLiteral"
@dataclass
class BoolLiteral(Node):
    value: bool = False
    node_type: str = "BoolLiteral"
@dataclass
class Identifier(Node):
    name: str = ""
    node_type: str = "Identifier"
@dataclass
class UnaryOp(Node):
    operator: str = ""
    operand: Any = None
    node_type: str = "UnaryOp"
@dataclass
class BinaryOp(Node):
    operator: str = ""
    left: Any = None
    right: Any = None
    node_type: str = "BinaryOp"

@dataclass
class VarDecl(Node):
    data_type: DataType = "int"
    name: str = ""
    initializer: Optional[Any] = None
    node_type: str = "VarDecl"
@dataclass
class Assignment(Node):
    name: str = ""
    value: Any = None
    node_type: str = "Assignment"
@dataclass
class Print(Node):
    argument: Any = None
    node_type: str = "Print"
@dataclass
class If(Node):
    condition: Any = None
    then_branch: Any = None
    else_branch: Optional[Any] = None
    node_type: str = "If"
@dataclass
class While(Node):
    condition: Any = None
    body: Any = None
    node_type: str = "While"
@dataclass
class Block(Node):
    statements: list = field(default_factory=list)
    node_type: str = "Block"
@dataclass
class Program:
    statements: list = field(default_factory=list)
    node_type: str = "Program"

Expr = Union[IntegerLiteral, FloatLiteral, StringLiteral, BoolLiteral,
             Identifier, UnaryOp, BinaryOp]
Stmt = Union[VarDecl, Assignment, Print, If, While, Block]

def to_json(node: Any) -> Any:
    if node is None: return None
    if isinstance(node, Program):
        return {"type": "Program", "statements": [to_json(s) for s in node.statements]}
    if isinstance(node, Block):
        return {"type": "Block", "statements": [to_json(s) for s in node.statements]}
    d: dict = {"type": node.node_type, "line": node.line}
    if isinstance(node, (IntegerLiteral, FloatLiteral)): d["value"] = node.value
    elif isinstance(node, StringLiteral): d["value"] = node.value
    elif isinstance(node, BoolLiteral): d["value"] = node.value
    elif isinstance(node, Identifier): d["name"] = node.name
    elif isinstance(node, VarDecl):
        d.update(data_type=node.data_type, name=node.name,
                 initializer=to_json(node.initializer) if node.initializer else None)
    elif isinstance(node, Assignment):
        d.update(name=node.name, value=to_json(node.value))
    elif isinstance(node, Print):
        d.update(argument=to_json(node.argument))
    elif isinstance(node, If):
        d.update(condition=to_json(node.condition), then_branch=to_json(node.then_branch),
                 else_branch=to_json(node.else_branch) if node.else_branch else None)
    elif isinstance(node, While):
        d.update(condition=to_json(node.condition), body=to_json(node.body))
    elif isinstance(node, UnaryOp):
        d.update(operator=node.operator, operand=to_json(node.operand))
    elif isinstance(node, BinaryOp):
        d.update(operator=node.operator, left=to_json(node.left), right=to_json(node.right))
    return d
