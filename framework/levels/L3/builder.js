class L3Builder extends L2Builder {
    handle(node) {
        if (node.type === 'head_expression') {
            // If the assignment has multiple expressions
            if (this.has_sub_expression(node.child(0))) {
                var head_expression = this.handle(node.child(0));
                this.assign(node, false, new Content(CONTENT_TYPES.REGISTER, '$x'), head_expression);
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
                var left_expression = this.handle(get_left_child(node));
                this.assign(node, false, new Content(CONTENT_TYPES.REGISTER, '$x'), left_expression);
                this.create_temp_var_with_content(node, 'u8', new Content(CONTENT_TYPES.REGISTER, '$x'));
                var right_expression = this.handle(get_right_child(node));
                this.assign(node, false, new Content(CONTENT_TYPES.REGISTER, '$x'), right_expression);
                var final_expression = new Expression(CONTENT_TYPES.BIN_EXPRESSION, this.read_temp_var(`${this.frame_pointer}`), get_operator(node).text, new Content(CONTENT_TYPES.REGISTER, '$x'));
                this.end_scope();
                return final_expression;
            }
        } else {
            return super.handle(node);
        }
    }

    create_temp_var_with_content(node, var_size, content_expression) {
        var variable_size = get_variable_bytesize(var_size);
        this.frame_pointer -= variable_size;
        this.head.variables[this.frame_pointer] = [this.stack_pointer - this.frame_pointer, var_size];
        var writer = this.read_temp_var(this.frame_pointer);
        this.assign(node, false, writer, content_expression);
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