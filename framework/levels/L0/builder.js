class L0Visitor {

    visit(node) {
        if ([';', '\n'].includes(node.type)) return;
        if (node.type === 'statement') node_stack.push(node);
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
        this._emitter.syscall(node);
    }
}

class L0Emitter{
    _data = {};
    _const = {};
    _labels = {};
    _statements = [];
    _ECS = new ECS();


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

    register(register_id) {
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

    syscall(node) {
        this.push_statement(new ByteCode(OP.SYSCALL));
    }


    assignment(is_conditional, writer, expression, drawfun = null, drawparams = null) {
        this.push_statement(new ByteCode(get_opcode(expression), [is_conditional, writer].concat(convert_content_to_array(expression))), drawfun, drawparams);
    }

    push_statement(byte_code, drawfun, drawparams) {
        this._statements.push(byte_code);
        this._ECS.nodes.push(node_stack.peek());
        this._ECS.draws.push(drawfun);
        this._ECS.drawparams.push(drawparams);
    }
}



var node_stack = {
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