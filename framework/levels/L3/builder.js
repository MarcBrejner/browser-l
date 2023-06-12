class L3Builder extends L2Builder {
    handle(node) {
        if (node.type === 'statement') {
            if (node.child(0).child(2).type === 'head_expression') {
                this.number_of_temp_var = 0;
                this.create_scope(node);
                return;
            }
            return super.handle(node);
        } else if (node.type === 'head_expression') { 
            return this.handle(node.child(0));
        } else if (node.type === 'expression') {
            // if the expression does not contain any sub-expressions it should be sent down to L0 instead of being handled here.
            if (!this.has_sub_expression(node)) {
                return super.handle(node);
            }

            if (node.childCount === 3) {
                this.number_of_temp_var++;
                var left_number = this.number_of_temp_var;
                this.create_temp_var(node, `_t${this.number_of_temp_var}`, 'u8', node.child(0));
                this.number_of_temp_var++;
                var right_number = this.number_of_temp_var;
                this.create_temp_var(node, `_t${this.number_of_temp_var}`, 'u8', node.child(2));
                var left = this.read_temp_var(`_t${left_number}`)
                var right = this.read_temp_var(`_t${right_number}`)
                this.push_statement(node, new ByteCode(OP.ASSIGN, [false, new Content(CONTENT_TYPES.REGISTER, '$x'), left]));
                this.push_statement(node, new ByteCode(OP.ASSIGN, [false, new Content(CONTENT_TYPES.REGISTER, '$y'), right]));
                return new Expression(CONTENT_TYPES.BIN_EXPRESSION, new Content(CONTENT_TYPES.REGISTER, '$x'), node.child(1).text, new Content(CONTENT_TYPES.REGISTER, '$y'));
            } else {
                this.number_of_temp_var++;
                var left_number = this.number_of_temp_var;
                this.create_temp_var(node, `_t${this.number_of_temp_var}`, 'u8', node.child(1));
                this.number_of_temp_var++;
                var right_number = this.number_of_temp_var;
                this.create_temp_var(node, `_t${this.number_of_temp_var}`, 'u8', node.child(5));
                var left = this.read_temp_var(`_t${left_number}`)
                var right = this.read_temp_var(`_t${right_number}`)
                this.push_statement(node, new ByteCode(OP.ASSIGN, [false, new Content(CONTENT_TYPES.REGISTER, '$x'), left]));
                this.push_statement(node, new ByteCode(OP.ASSIGN, [false, new Content(CONTENT_TYPES.REGISTER, '$y'), right]));
                return new Expression(CONTENT_TYPES.BIN_EXPRESSION, new Content(CONTENT_TYPES.REGISTER, '$x'), node.child(3).text, new Content(CONTENT_TYPES.REGISTER, '$y'));
            }
        } else {
            return super.handle(node);
        }
    }

    has_sub_expression(expression) {
        for (var i = 0; i < expression.childCount; i++) {
            if (expression.child(i).type === 'expression') {
                return true;
            } 
        }
        return false;
    }
    number_of_temp_var = 0;
}