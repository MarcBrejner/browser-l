class PrettyPrinter {
  constructor(program) { this.program = program }

  print_program(state) {
    let pretty_source_code = "";
    let instructions = this.program.instructions;
    for (let i = 0; i < instructions.length; i++) {
      var one_indexed = i + 1;
      let res = `<span id=line-number>${one_indexed} </span>` + instructions[i].handle(this) + `<br>`;
      if (one_indexed === state.registers['$!']) {
        pretty_source_code +=
            `<div id=highlight-line>${res}</div>`
      } else {
        pretty_source_code += res
      }
    }
    return pretty_source_code;
  }

  syscall() { return `<span style='color: red'>syscall;</span>\n` }

  assign_binary(conditional, writer, reader1, opr, reader2) {
    var cond = conditional ? '?=' : ':=';
    return `${this.wrap_assign(writer)} ${this.wrap_opr(cond)} ${this.wrap_assign(reader1)} ${this.wrap_opr(opr)} ${this.wrap_assign(reader2)}${this.wrap_semicolon()}\n`
  }

  assign_unary(conditional, writer, opr, reader) {
    var cond = conditional ? '?=' : ':=';
    return `${this.wrap_assign(writer)} ${this.wrap_opr(cond)} ${this.wrap_opr(opr)} ${this.wrap_assign(reader)}${this.wrap_semicolon()}\n`
  }

  assign(conditional, writer, reader) {
    var cond = conditional ? '?=' : ':=';
    return `${this.wrap_assign(writer)} ${this.wrap_opr(cond)} ${this.wrap_assign(reader)}${this.wrap_semicolon()}\n`
  }

  wrap_assign(assign) {
    return `<span id=assign>${assign.id}</span>`;
  }

  wrap_opr(opr) {
    return `<span id=opr>${opr}</span>`;
  }

  wrap_semicolon() {
    return `<span id=semicolon>;</span>`;
  }
}

/*
print_declaration_const(operands) {
    var [identifier, data] = operands;
    return `const ${identifier} ${data};\n`
}

print_declaration_data(operands) {
    var [identifier, data] = operands;
    return `data ${identifier} ${data};\n`
}

print_label(operands) {
    var [label, pc_pointer] = operands;
    return `#${label}\n`
}
*/
