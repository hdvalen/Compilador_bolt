// Example MiniCompiler programs used by the "Cargar ejemplo" button.

export interface Example {
  name: string;
  description: string;
  code: string;
}

export const EXAMPLES: Example[] = [
  {
    name: 'Programa válido',
    description: 'Declaraciones, expresiones con precedencia, if/else y while.',
    code: `// Programa de ejemplo: válido en las tres fases
int edad = 20;
float nota = 4.5;
string nombre = "Valentina";
bool aprobado = true;

int resultado = 10 + 5 * 2;
print(resultado);

if (edad >= 18) {
    print(nombre);
} else {
    print("Menor de edad");
}

int i = 0;
while (i < 3) {
    print(i);
    i = i + 1;
}
`,
  },
  {
    name: 'Error léxico',
    description: 'Carácter inválido y cadena sin cerrar.',
    code: `int x = 5;
int y = 10 # caracter invalido;
string s = "cadena sin cerrar;
print(x);
`,
  },
  {
    name: 'Error sintáctico',
    description: 'Punto y coma faltante y paréntesis sin cerrar.',
    code: `int x = 5
int y = (10 + 3;
print(x);
`,
  },
  {
    name: 'Error semántico',
    description: 'Variable no declarada, tipos incompatibles, ámbito y condición.',
    code: `int edad = "veinte";
float nota = 4.5;
bool flag = 5;

print(desconocida);

if (edad) {
    int interno = 1;
}
print(interno);

int z = 10 / 0;
`,
  },
  {
    name: 'Expresiones con precedencia',
    description: 'Muestra cómo * y / atan más fuerte que + y -.',
    code: `int a = 2 + 3 * 4;
int b = (2 + 3) * 4;
int c = 10 - 6 / 2;
float d = 1.5 + 2.5 * 2;
print(a);
print(b);
print(c);
print(d);
`,
  },
  {
    name: 'Operadores lógicos y relacionales',
    description: 'Combinaciones de &&, ||, ! y comparaciones.',
    code: `bool a = true;
bool b = false;
bool c = a && !b;
bool d = (a || b) && (5 > 3);
print(c);
print(d);
`,
  },
];
