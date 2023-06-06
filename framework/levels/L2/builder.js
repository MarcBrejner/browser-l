class L2Builder extends L1Builder {
    handle(node) {
        if (node.type === "variable") { 
            this.variable_declaration(node);
        } else if (node.type === "variable_name") {
            return new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.DATA, '&_' + node.text), get_datatype(variables.variableTypes["&_" + node.text]));
        } else {
            return super.handle(node);
        }
    }

    variable_declaration(node) {
        var variable_name = node.child(0);
        var type = node.child(2);
        var expression = node.child(4);
        var variable_size = parseInt(type.text.replace(/\D/g, ''));
        variables.variableTypes['&_' + variable_name.text] = type.text;
        var memory_allocation = "";
        for (var i = 0; i < variable_size/8; i++) {
            memory_allocation += "0";
        }
        this.data['&_' + variable_name.text] = memory_allocation;
        var _expression = this.handle(expression);
        this.statements.push(new ByteCode(OP.ASSIGN, [false, new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.DATA, '&_' + variable_name.text), get_datatype(type.text))].concat(_expression)));
        this.set_ECS(node)
    }
}