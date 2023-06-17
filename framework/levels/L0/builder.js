class L0Builder {
    _data = {};
    _const = {};
    _labels = {};
    _statements = [];
    _ECS = new ECS();

    visit(node) {
        if ([';', '\n'].includes(node.type)) return;
        return this[node.type](node);
    }

    source_file(node) {
        node.children.forEach(child => {
            this.visit(child);
        });
    }

    declaration(node) {
        node.children.forEach(child => {
            this.visit(child);
        });
    }

    statements(node) {
        node.children.forEach(child => {
            this.visit(child);
        });
    }

    comment(node) {
        return;
    }

    statement(node) {
        this.visit(node.child(0));
    }

    declaration(node) {
        this.visit(node.child(0));
    }

    expression(node) {
        switch (node.childCount) {
            case 1:
                return new Expression(CONTENT_TYPES.EXPRESSION, this.visit(node.child(0)));
            case 2:
                return new Expression(CONTENT_TYPES.UN_EXPRESSION, this.visit(node.child(1)), node.child(0).text);
            case 3:
                var left_reader = this.visit(get_left_child(node));
                var right_reader = this.visit(get_right_child(node));
                if (left_reader.type === CONTENT_TYPES.MEMORY && right_reader.type === CONTENT_TYPES.MEMORY) {
                    this.assign(node, false, new Content(CONTENT_TYPES.REGISTER, '$x'), left_reader);
                    this.assign(node, false, new Content(CONTENT_TYPES.REGISTER, '$y'), right_reader);
                    left_reader = new Content(CONTENT_TYPES.REGISTER, '$x');
                    right_reader = new Content(CONTENT_TYPES.REGISTER, '$y');
                } 
                return new Expression(CONTENT_TYPES.BIN_EXPRESSION, left_reader, get_operator(node).text,  right_reader);
        }
    }

    memory_expression(node) {
        switch (node.childCount) {
            case 1:
                return new Expression(CONTENT_TYPES.EXPRESSION, this.visit(node.child(0)));
            case 2:
                return new Expression(CONTENT_TYPES.UN_EXPRESSION, this.visit(node.child(1)), node.child(0).text);
            case 3:
                var left_reader = this.visit(get_left_child(node));
                var right_reader = this.visit(get_right_child(node));
                if (left_reader.type === CONTENT_TYPES.MEMORY && right_reader.type === CONTENT_TYPES.MEMORY) {
                    this.assign(node, false, new Content(CONTENT_TYPES.REGISTER, '$x'), left_reader);
                    this.assign(node, false, new Content(CONTENT_TYPES.REGISTER, '$y'), right_reader);
                    left_reader = new Content(CONTENT_TYPES.REGISTER, '$x');
                    right_reader = new Content(CONTENT_TYPES.REGISTER, '$y');
                } 
                return new Expression(CONTENT_TYPES.BIN_EXPRESSION, left_reader, get_operator(node).text,  right_reader);
        }
    }

    number(node) {
        return new Content(CONTENT_TYPES.NUMBER, parseInt(node.text));
    }

    constant(node) {
        return new Content(CONTENT_TYPES.CONSTANT, node.text);
    }

    data(node) {
        return new Content(CONTENT_TYPES.DATA, node.text);
    }

    memory_reader(node) {
        return this.visit(node.child(0));
    }

    reader(node) {
        return this.visit(node.child(0));
    }

    writer(node) {
        return this.visit(node.child(0));
    }

    register(node) {
        return new Content(CONTENT_TYPES.REGISTER, node.text);
    }

    memory(node) {
        return new Content(CONTENT_TYPES.MEMORY, this.visit(node.child(1)), get_datatype(node.child(3).text));
    }

    assignment(node) {
        var is_conditional = node.child(1).text === "?=" ? true : false;
        var writer = this.visit(node.child(0));
        var expression = this.visit(node.child(2));
        this.assign(node, is_conditional, writer, expression);
    }

    constant_declaration(node) {
        let id = node.child(1).text;
        let value = node.child(2).text;
        this._const[id] = value;
    }

    data_declaration(node) {
        let id = node.child(1).text;
        let value = node.child(2).text;
        this._data[id] = value;
    }   

    label(node) {
        this._labels[node.text] = this.statements.length;
    }

    syscall(node) {
        this.push_statement(node, new ByteCode(OP.SYSCALL));
    }

    assign(node, is_conditional, writer, expression, drawfun = null, drawparams = null) {
        this.push_statement(node, new ByteCode(get_opcode(expression), [is_conditional, writer].concat(convert_content_to_array(expression))), drawfun, drawparams);
    }

    push_statement(node, byte_code, drawfun, drawparams) {
        this._statements.push(byte_code);
        this._ECS.nodes.push(node);
        this._ECS.draws.push(drawfun);
        this._ECS.drawparams.push(drawparams);
    }
}