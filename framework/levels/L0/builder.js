class L0Visitor {

    visit(node) {
        if (node.type === "statement") this._emitter.node_stack.push(node);
        if (this[node.type] === undefined) {
            var r = this.default(node);
            return r;
        } else {
            var r = this[node.type](node);
            return r;
        }
    }

    default(node) {
        if (node.childCount == 1) {
            return this.visit(node.child(0));
        } else {
            node.children.forEach(c => { this.visit(c) });
        }
    }

    comment(node) {
        return;
    }

    expression(node) {
        switch (node.childCount) {
            case 1:
                var reader = this.visit(node.child(0));
                return this._emitter.expression(reader)
            case 2:
                var oper = node.child(0).text;
                var reader =  this.visit(node.child(1));
                return this._emitter.unary_expression(oper, reader)
            case 3:
                var left_reader = this.visit(get_left_child(node));
                var oper = get_operator(node).text;
                var right_reader = this.visit(get_right_child(node));
                return this._emitter.binary_expression(left_reader, oper, right_reader);
        }
    }

    memory_expression(node) {
        return this.expression(node);
    }

    number(node) {
        var number = parseInt(node.text);
        return this._emitter.number(number);
    }

    constant(node) {
        var constant_id = node.text;
        return this._emitter.constant(constant_id);
    }

    data(node) {
        var data_id = node.text;
        return this._emitter.data(data_id);
    }

    register(node) {
        var register_id = node.text;
        return this._emitter.register(register_id);
    }

    memory(node) {
        var memory_id = this.visit(node.child(1));
        var datatype = get_datatype(node.child(3).text);
        return this._emitter.memory(memory_id, datatype);
    }

    assignment(node) {
        var is_conditional = node.child(1).text === "?=" ? true : false;
        var writer = this.visit(node.child(0));
        var expression = this.visit(node.child(2));
        this._emitter.assignment(is_conditional, writer, expression);
    }

    constant_declaration(node) {
        let constant_id = node.child(1).text;
        let value = node.child(2).text;
        this._emitter.constant_declaration(constant_id,value);
    }

    data_declaration(node) {
        let data_id = node.child(1).text;
        let value = node.child(2).text;
        this._emitter.data_declaration(data_id,value);
    }   

    label(node) {
        var label_id = node.text;
        if(node.parent.type === 'statements'){
            this._emitter.set_label(label_id);
        }else{
            return this._emitter.get_label(label_id);
        }
    }

    syscall(node) {
        this._emitter.syscall();
    }
}

class L0Emitter {
    _data = {};
    _const = {};
    _labels = {};
    _statements = [];
    _ECS = new ECS();
    _static_draws = {};

    constructor() {
        this._static_draws.L0 = L0Draw;
    }

    expression(reader){
        return new Expression(CONTENT_TYPES.EXPRESSION, reader);
    }

    unary_expression(oper, reader){
        return new Expression(CONTENT_TYPES.UN_EXPRESSION, reader, oper);
    }

    binary_expression(left_reader, oper, right_reader){
        if (left_reader.type === CONTENT_TYPES.MEMORY && right_reader.type === CONTENT_TYPES.MEMORY) {
            this.assignment(false, this.register('$x'), left_reader);
            this.assignment(false, this.register('$y'), right_reader);
            left_reader = this.register('$x');
            right_reader = this.register('$y');
        }

        return new Expression(CONTENT_TYPES.BIN_EXPRESSION, left_reader, oper,  right_reader);
    }

    number(number) {
        return new Content(CONTENT_TYPES.NUMBER, number);
    }

    constant(constant_id) {
        return new Content(CONTENT_TYPES.CONSTANT, constant_id);
    }

    data(data_id) {
        return new Content(CONTENT_TYPES.DATA, data_id);
    }

    register(register_id) {;
        return new Content(CONTENT_TYPES.REGISTER, register_id);
    }

    memory(memory_id, datatype) {
        return new Content(CONTENT_TYPES.MEMORY, memory_id, datatype);
    }

    constant_declaration(constant_id, constant_value) {
        this._const[constant_id] = constant_value;
    }

    data_declaration(data_id, data_value) {
        this._data[data_id] = data_value;
    }   

    set_label(label_id) {
        this._labels[label_id] = this._statements.length;
    }

    get_label(label_id) {
        return new Content(CONTENT_TYPES.LABEL, label_id);
    }

    syscall() {
        this.push_statement(new ByteCode(OP.SYSCALL));
    }


    assignment(is_conditional, writer, expression, drawfun = null, drawparams = null) {
        this.push_statement(new ByteCode(get_opcode(expression), [is_conditional, writer].concat(convert_content_to_array(expression))), drawfun, drawparams);
    }

    push_statement(byte_code, drawfun, drawparams) {
        this._statements.push(byte_code);
        this._ECS.nodes.push(this.node_stack.peek());
        this._ECS.draws.push(drawfun);
        this._ECS.drawparams.push(drawparams);
    }

    node_stack = {
        stack: [],
    
        push(node) {
            this.stack.push(node);
        },
    
        pop() {
            if (this.stack.length == 0)
                return "Underflow";
            return this.stack.pop();
        },
    
        peek(){
            return this.stack[this.stack.length-1];
        }
    };
}

const L0Draw = {
    program: null,
    state: null,

    draw(vm) {
        this.program = vm.program;
        this.state = vm.state;
        if(this.program.error_msg !== null){
          return this.program.error_msg;
        }
        var pretty_source_code = "";
        var instructions = this.program.instructions;
        var debugging = document.querySelector('#debugbutton').disabled;
        for (var i = 0; i < instructions.length; i++) {
          var one_indexed = i;
          var res = `<span id=line-number>${one_indexed} </span>` + instructions[i].handle(this) + this.print_label(i) +`<br>`;
          if (!debugging || this.state === undefined) {
            pretty_source_code += res;
          } else {
            if (one_indexed === this.state.registers['$!']) {
              pretty_source_code +=
                  `<span class=highlight-line>${res}</span>`
            } else {
              pretty_source_code += res
            }
          }
        }
        document.getElementById("prettyPretty").innerHTML = pretty_source_code;
      },
    
      syscall() { return `<span style='color: red'>syscall;</span>\n` },
    
      assign_binary(conditional, writer, reader1, opr, reader2) {
        var cond = conditional ? '?=' : ':=';
        return `${this.wrap_assign(this.print_content(writer))} ${this.wrap_opr(cond)} ${this.wrap_assign(this.print_content(reader1))} ${this.wrap_opr(opr)} ${this.wrap_assign(this.print_content(reader2))}${this.wrap_semicolon()}\n`
      },
    
      assign_unary(conditional, writer, opr, reader) {
        var cond = conditional ? '?=' : ':=';
        return `${this.wrap_assign(this.print_content(writer))} ${this.wrap_opr(cond)} ${this.wrap_opr(opr)} ${this.wrap_assign(this.print_content(reader))}${this.wrap_semicolon()}\n`
      },
    
      assign(conditional, writer, reader) {
        var cond = conditional ? '?=' : ':=';
        return `${this.wrap_assign(this.print_content(writer))} ${this.wrap_opr(cond)} ${this.wrap_assign(this.print_content(reader))}${this.wrap_semicolon()}\n`
      },
    
      wrap_assign(assign) {
        return `<span id=assign>${assign}</span>`;
      },
    
      wrap_opr(opr) {
        return `<span id=opr>${opr}</span>`;
      },
    
      wrap_semicolon() {
        return `<span id=semicolon>;</span>`;
      },
    
      wrap_const(constant) {
        return `<span id=constant>${constant}</span>`;
      },
    
      wrap_label(label) {
        return `<span id=label>${label}</span>`;
      },
    
      print_content(content){
        if (content.type === CONTENT_TYPES.CONSTANT){
          return `${this.wrap_const(`${content.id} (${this.program.constants[content.id]})`)}`
        }else if(content.type == CONTENT_TYPES.MEMORY){
          return this.print_memory(content);
        }else{
          return `${content.id}`
        }
      },
    
      print_memory(content) {
        if (content.id.type === CONTENT_TYPES.BIN_EXPRESSION) {
          return `[${content.id.reader1.get_text()} ${content.id.opr} ${content.id.reader2.get_text()},${content.datatype.type}${content.datatype.size}]`
        }
        else {
          return `[${content.get_text()},${content.datatype.type}${content.datatype.size}]`
        }
      },
    
      print_label(i){
        var [exists, label_key] = getKeyByValueIfValueExists(this.program.labels, i);
        var result = exists ? `${this.wrap_label(label_key)}` : "";
        return result;
      },
    
}