// bytecode: (enum: OP, int: line_number, array?: operands)
const OP = {
  DEC_CONST: 0, // (OP.DEC_DATA, int: line_number, (string: identifier, int: data))
  DEC_DATA: 1, // (OP.DEC_DATA, int: line_number, (string: identifier, string: data))
  LABEL: 2, // (OP.LABEL, int: line_number, (string: label, int: PC_pointer))
  SYSCALL: 3, // (OP.SYSCALL, int: line_number)
  ASSIGN_BIN: 4, // (OP.ASSIGN_BIN, int: line_number, (string: writer, string: reader1, string: opr, string: reader2))
  ASSIGN_UN: 5, // (OP.ASSIGN_UN, int: line_number, (string: writer, string: opr string: reader))
  ASSIGN: 6, // (OP.ASSIGN, int: line_number, (enum: writer, string: reader))
};

const CONTENT_TYPES = {
  REGISTER: 0,
  MEMORY: 1,
  CONSTANT: 2,
  DATA: 3,
  LABEL: 4,
  NUMBER: 5,
  EXPRESSION: 6,
  UN_EXPRESSION: 7,
  BIN_EXPRESSION: 8,
};

const DT = {
  UNSIGNED: 'u',
  SIGNED: 'i',
  FLOAT: 'f'
}

class datatype{
  constructor(size, type){
    this.size = size;
    this.type = type;
  }
}


class ByteCode {
  constructor(opcode, operands = []) {
    this.opcode = opcode;
    this.operands = operands;
  }

  handle(handler) {
    switch (this.opcode) {
      case OP.SYSCALL:
        return handler.syscall();
      case OP.ASSIGN_BIN:
        var [conditional, w, reader1, opr, reader2] = this.operands;
        return handler.assign_binary(conditional, w, reader1, opr, reader2);
      case OP.ASSIGN_UN:
        var [conditional, w, opr, r] = this.operands;
        return handler.assign_unary(conditional, w, opr, r);
      case OP.ASSIGN:
        var [conditional, w, r] = this.operands;
        return handler.assign(conditional, w, r);
      default:
        throw new Error("Unknown Opcode");
    }
  }
}

class Content {
  constructor(type, id, datatype = null) {
    this.type = type;
    this.id = id;//[$x+2,u32]:=2;
    this.datatype = datatype;
  }

  get_text() {
    if (this.id.id == null) {
      return this.id;
    }
    return this.id.get_text();
  }
}

class Expression {
  constructor(type, reader1, opr = null, reader2 = null) {
    this.type = type;
    this.reader1 = reader1;
    this.opr = opr;
    this.reader2 = reader2;
  }
}

class Program {
  constructor(instructions, ecs, data, constants, labels, error_msg=null) {
    this.instructions = instructions;
    this.ECS = ecs;
    this.data = data;
    this.constants = constants;
    this.labels = labels;
    this.error_msg = error_msg
  }
}

class ECS {
    constructor() {
        this.nodes = new Array();
    }
}
