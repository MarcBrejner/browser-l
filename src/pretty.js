/*class PrettyPrinter {

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
      var one_indexed = i;
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
    return `${this.wrap_assign(this.print_content(writer))} ${this.wrap_opr(cond)} ${this.wrap_assign(this.print_content(reader1))} ${this.wrap_opr(opr)} ${this.wrap_assign(this.print_content(reader2))}${this.wrap_semicolon()}\n`
  }

  assign_unary(conditional, writer, opr, reader) {
    var cond = conditional ? '?=' : ':=';
    return `${this.wrap_assign(this.print_content(writer))} ${this.wrap_opr(cond)} ${this.wrap_opr(opr)} ${this.wrap_assign(this.print_content(reader))}${this.wrap_semicolon()}\n`
  }

  assign(conditional, writer, reader) {
    var cond = conditional ? '?=' : ':=';
    return `${this.wrap_assign(this.print_content(writer))} ${this.wrap_opr(cond)} ${this.wrap_assign(this.print_content(reader))}${this.wrap_semicolon()}\n`
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

  print_content(content){
    if (content.type === CONTENT_TYPES.CONSTANT){
      return `${this.wrap_const(`${content.id} (${this.program.constants[content.id]})`)}`
    }else if(content.type == CONTENT_TYPES.MEMORY){
      return this.print_memory(content);
    }else{
      return `${content.id}`
    }
  }

  print_memory(content) {
    if (content.id.type === CONTENT_TYPES.BIN_EXPRESSION) {
      return `[${content.id.reader1.get_text()} ${content.id.opr} ${content.id.reader2.get_text()},${content.datatype.type}${content.datatype.size}]`
    }
    else {
      return `[${content.get_text()},${content.datatype.type}${content.datatype.size}]`
    }
  }

  print_label(i){
    var [exists, label_key] = getKeyByValueIfValueExists(this.program.labels, i);
    var result = exists ? `${this.wrap_label(label_key)}` : "";
    return result;
  }

}
*/

function getKeyByValueIfValueExists(object, value) {
  if(Object.values(object).includes(value)){
    return [true, Object.keys(object).find(key => object[key] === value)];
  }else{
    return [false, null];
  }
}