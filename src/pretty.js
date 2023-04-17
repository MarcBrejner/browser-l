class PrettyPrinter {

  update_program(program) {
    this.program = program; 
  }

  print_program(state) {
    if(this.program.error_msg !== null){
      return this.program.error_msg;
    }
    var pretty_source_code = "";
    var instructions = this.program.instructions;
    var debugging = document.querySelector('#debugbutton').disabled;
    for (var i = 0; i < instructions.length; i++) {
      var one_indexed = i + 1;
      var res = `<span id=line-number>${one_indexed} </span>` + instructions[i].handle(this) + this.print_label(i) +`<br>`;
      if (!debugging || state === undefined) {
        pretty_source_code += res;
      } else {
        if (one_indexed === state.registers['$!']) {
          pretty_source_code +=
              `<span class=highlight-line>${res}</span>`
        } else {
          pretty_source_code += res
        }
      }
    }
    return pretty_source_code;
  }

  syscall() { return `<span style='color: red'>syscall;</span>\n` }

  assign_binary(conditional, writer, reader1, opr, reader2) {
    var cond = conditional ? '?=' : ':=';
    return `${this.wrap_assign(writer.id)} ${this.wrap_opr(cond)} ${this.wrap_assign(this.print_reader(reader1))} ${this.wrap_opr(opr)} ${this.wrap_assign(this.print_reader(reader2))}${this.wrap_semicolon()}\n`
  }

  assign_unary(conditional, writer, opr, reader) {
    var cond = conditional ? '?=' : ':=';
    return `${this.wrap_assign(writer.id)} ${this.wrap_opr(cond)} ${this.wrap_opr(opr)} ${this.wrap_assign(this.print_reader(reader))}${this.wrap_semicolon()}\n`
  }

  assign(conditional, writer, reader) {
    var cond = conditional ? '?=' : ':=';
    return `${this.wrap_assign(writer.id)} ${this.wrap_opr(cond)} ${this.wrap_assign(this.print_reader(reader))}${this.wrap_semicolon()}\n`
  }

  wrap_assign(assign) {
    return `<span id=assign>${assign}</span>`;
  }

  wrap_opr(opr) {
    return `<span id=opr>${opr}</span>`;
  }

  wrap_semicolon() {
    return `<span id=semicolon>;</span>`;
  }

  wrap_const(constant) {
    return `<span id=constant>${constant}</span>`;
  }

  wrap_label(label) {
    return `<span id=label>${label}</span>`;
  }

  print_reader(reader){
    if (reader.type === RT.CONSTANT){
      return `${this.wrap_const(`${reader.id} (${this.program.constants[reader.id]})`)}`
    }else if(reader.type == RT.MEMORY){
      return `[${reader.id},${reader.datatype}]`
    }else{
      return `${reader.id}`
    }
  }

  print_label(i){
    var [exists, label_key] = getKeyByValueIfValueExists(this.program.labels, i);
    var result = exists ? `${this.wrap_label(label_key)}` : "";
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
