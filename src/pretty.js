class PrettyPrinter {
  constructor(program) { this.program = program }

  print_program(state) {
    let pretty_source_code = "";
    let instructions = this.program.instructions;
    for (let i = 0; i < instructions.length; i++) {
      let res = `<span>${i}</span>` + instructions[i].handle(this) + this.print_label(i) + "<hr/>";
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
    return `${writer.id} ${cond} ${this.print_reader(reader1)} ${opr} ${this.print_reader(reader2)};\n`
  }

  assign_unary(conditional, writer, opr, reader) {
    var cond = conditional ? '?=' : ':=';
    return `${writer.id} ${cond} ${opr} ${this.print_reader(reader)};\n`
  }

  assign(conditional, writer, reader) {
    var cond = conditional ? '?=' : ':=';
    return `${writer.id} ${cond} ${this.print_reader(reader)};\n`
  }

  print_reader(reader){
    if (reader.type === RT.CONSTANT){
      return `${reader.id} (${this.program.constants[reader.id]})`
    }else{
      return `${reader.id}`
    }
  }

  print_label(i){
    let [exists, label_key] = getKeyByValueIfValueExists(this.program.labels, i);
    let result = exists ? `${label_key}` : "";
    return result;
  }

}

function getKeyByValueIfValueExists(object, value) {
  if(Object.values(object).includes(value)){
    return [true, Object.keys(object).find(key => object[key] === value)];
  }else{
    return [false, null];
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
