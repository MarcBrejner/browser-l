class PrettyPrinter {
  constructor(program) { this.program = program }

  print_program(state) {
    let pretty_source_code = "";
    let instructions = this.program.instructions;
    for (let i = 0; i < instructions.length; i++) {
      let res = `<span>${i}</span>` + instructions[i].handle(this) + "<hr/>";
      if (i === state.registers['$!']) {
        pretty_source_code +=
            `<span style='background-color: yellow'>${res}</span>`
      } else {
        pretty_source_code += res
      }
    }
    return pretty_source_code;
  }

  syscall() { return `<span style='color: red'>syscall;</span>\n` }

  assign_binary(conditional, writer, reader1, opr, reader2) {
    var cond = conditional ? '?=' : ':=';
    return `${writer.id} ${cond} ${reader1.id} ${opr} ${reader2.id};\n`
  }

  assign_unary(conditional, writer, opr, reader) {
    var cond = conditional ? '?=' : ':=';
    return `${writer.id} ${cond} ${opr} ${reader.id};\n`
  }

  assign(conditional, writer, reader) {
    var cond = conditional ? '?=' : ':=';
    return `${writer.id} ${cond} ${reader.id};\n`
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
