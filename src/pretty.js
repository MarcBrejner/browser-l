function parse_byte_code(program){
    let pretty_source_code = "";
    for(let i = 0; i < program.length; i++) {
        pretty_source_code += parse_instruction(program[i])
    }
    return pretty_source_code;
}

function parse_instruction(instruction) {
    let op_code = instruction[0];
    let operands = instruction[2];

    
    switch(op_code){
        case OP.DEC_CONST:
            return parse_declaration_const(operands);
        case OP.DEC_DATA:
            return parse_declaration_data(operands);
        case OP.LABEL:
            return parse_label(operands);
        case OP.SYSCALL:
            return parse_syscall();
        case OP.ASSIGN_BIN:
            return parse_assign_bin(operands);
        case OP.ASSIGN_UN:
            return parse_assign_un(operands);
        case OP.ASSIGN:
            return parse_assign(operands);
        case OP.COND_BIN:
            return parse_cond_bin(operands);
        case OP.COND_UN:
            return parse_cond_un(operands);
        case OP.COND:
            return parse_cond(operands);
        default:
            throw new Error("Unknown Opcode")
    }
}

function parse_declaration_const(operands) {
    var [identifier, data] = operands;
    return `const ${identifier} ${data};\n` 
}

function parse_declaration_data(operands) {
    var [identifier, data] = operands;
    return `data ${identifier} ${data};\n` 
}

function parse_label(operands) {
    var [label, pc_pointer] = operands;
    return `#${label}\n` 
}

function parse_syscall() {
    return `syscall;\n` 
}

function parse_assign_bin(operands) {
    var [writer, reader1, opr, reader2] = operands;
    return `${writer.id} := ${reader1.id} ${opr} ${reader2.id};\n` 
}

function parse_assign_un(operands) {
    var [writer, opr, reader] = operands;
    return `${writer.id} := ${opr} ${reader.id};\n` 
}

function parse_assign(operands) {
    var [writer, reader] = operands;
    return `${writer.id} := ${reader.id};\n` 
}

function parse_cond_bin(operands) {
    var [writer, reader1, opr, reader2] = operands;
    return `${writer.id} ?= ${reader1.id} ${opr} ${reader2.id};\n` 
}

function parse_cond_un(operands) {
    var [writer, opr, reader] = operands;
    return `${writer.id} ?= ${opr} ${reader.id};\n` 
}

function parse_cond(operands) {
    var [writer, reader] = operands;
    return `${writer.id} ?= ${reader.id};\n` 
}