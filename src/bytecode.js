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

const WT = {
  REGISTER: 0,
  MEMORY: 1,
};

const RT = {
  REGISTER: 0,
  MEMORY: 1,
  CONSTANT: 2,
  DATA: 3,
  LABEL: 4,
  NUMBER: 5,
};

class bytecode {
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

class writer {
  constructor(writer_type, writer_id) {
    this.type = writer_type;
    this.id = writer_id;
  }
}

class reader {
  constructor(reader_type, reader_id) {
    this.type = reader_type;
    this.id = reader_id;
  }
}

class program {
  constructor(instructions, ecs, data, constants, labels) {
    this.instructions = instructions;
    this.ECS = ecs;
    this.data = data;
    this.constants = constants;
    this.labels = labels;
  }
}

class ECS {
    constructor() {
        this.LineNumber = new Array();
        this.StartIndex = new Array();
        this.EndIndex = new Array();
    }
}


/*
function handle(bytecode) {
    bytecode.handle({
    syscall:() => {

    },
    assign_binary: (cond, w, r1, r2) => {

    }
    })
}
*/
