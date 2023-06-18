class L0Visitor {

    visit(node) {
        if ([';', '\n'].includes(node.type)) return;
        if (this[node.type] === undefined) {
            return this.default(node);
        } else {
            return this[node.type](node);
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
                return this._emitter.binary_expression(node, left_reader, oper, right_reader);
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
        this._emitter.assignment(node, is_conditional, writer, expression);
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
        this._emitter.label(label_id);
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

    binary_expression(node, left_reader, oper, right_reader){
        if (left_reader.type === CONTENT_TYPES.MEMORY && right_reader.type === CONTENT_TYPES.MEMORY) {
            this.assignment(node, false, new Content(CONTENT_TYPES.REGISTER, '$x'), left_reader);
            this.assignment(node, false, new Content(CONTENT_TYPES.REGISTER, '$y'), right_reader);
            left_reader = new Content(CONTENT_TYPES.REGISTER, '$x');
            right_reader = new Content(CONTENT_TYPES.REGISTER, '$y');
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

    label(label_id) {
        this._labels[label_id] = this._statements.length;
    }

    syscall(node) {
        this.push_statement(node, new ByteCode(OP.SYSCALL));
    }


    assignment(node, is_conditional, writer, expression, drawfun = null, drawparams = null) {
        this.push_statement(node, new ByteCode(get_opcode(expression), [is_conditional, writer].concat(convert_content_to_array(expression))), drawfun, drawparams);
    }

    push_statement(node, byte_code, drawfun, drawparams) {
        this._statements.push(byte_code);
        this._ECS.nodes.push(node);
        this._ECS.draws.push(drawfun);
        this._ECS.drawparams.push(drawparams);
    }
}