class L3Builder extends L2Builder {
    handle(node) {
        if (node.type === 'head_expression') {
            // If the assignment has multiple expressions
            if (this.has_sub_expression(node.child(0))) {
                var head_expression = this.handle(node.child(0));
                this.push_statement(node, new ByteCode(this.get_opcode(head_expression), [false, new Content(CONTENT_TYPES.REGISTER, '$x')].concat(this.convert_content_to_array(head_expression))));
                return new Expression(CONTENT_TYPES.EXPRESSION, new Content(CONTENT_TYPES.REGISTER, '$x'));
            }
            return this.handle(node.child(0));
        } else if (node.type === 'expression') {
            // if the expression does not contain any sub-expressions it should be sent down to L0 instead of being handled here.
            if (!this.has_sub_expression(node)) {
                return super.handle(node);
            }
            // The algo:

            // Start scope
            // recursively handle left side (by getting back into the block, which saves the result in $x)
            // Save $x in a temp var e.g. t0
            // recursively handle right side
            // push statement $x:= t0 + $x;
            // end scope

            // Only works when both children are expressions
            if (node.childCount === 7) {
                this.start_scope();
                var left_expression = this.handle(node.child(1));
                this.push_statement(node, new ByteCode(this.get_opcode(left_expression), [false, new Content(CONTENT_TYPES.REGISTER, '$x')].concat(this.convert_content_to_array(left_expression))));
                this.create_temp_var_with_content(node, 'u8', new Content(CONTENT_TYPES.REGISTER, '$x'));
                var right_expression = this.handle(node.child(5));
                this.push_statement(node, new ByteCode(this.get_opcode(right_expression), [false, new Content(CONTENT_TYPES.REGISTER, '$x')].concat(this.convert_content_to_array(right_expression))));
                var final_expression = new Expression(CONTENT_TYPES.BIN_EXPRESSION, this.read_temp_var(`${this.variable_pointer}`), node.child(3).text, new Content(CONTENT_TYPES.REGISTER, '$x'));
                this.end_scope();
                return final_expression;
            }
        } else {
            return super.handle(node);
        }
    }

    create_temp_var_with_content(node, var_size, content_expression) {
        var variable_size = get_variable_bytesize(var_size);
        this.variable_pointer -= variable_size;
        this.head.variables[this.variable_pointer] = [this.stack_pointer - this.variable_pointer, var_size];
        var writer = this.read_temp_var(this.variable_pointer);
        this.push_statement(node, new ByteCode(this.get_opcode(content_expression), [false, writer].concat(this.convert_content_to_array(content_expression))));
    }

    has_sub_expression(expression) {
        for (var i = 0; i < expression.childCount; i++) {
            if (expression.child(i).type === 'expression') {
                return true;
            } 
        }
        return false;
    }
}