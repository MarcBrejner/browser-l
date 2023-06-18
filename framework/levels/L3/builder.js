class L3Visitor extends L2Visitor {
    expression(node) {
        // if the expression does not contain any sub-expressions it should be sent down to L0 instead of being handled here.
        if (!this.has_sub_expression(node)) {
            return super.expression(node);
        }
        // The algo:

        // Start scope
        // recursively handle the left child
        // If the right child is an expression, save result in a temporary variable
        // Else save in $x
        // recursively handle right side
        // If we are out of scopes it is the last expression and we save the result in $x
        // Else we return the full expression: left_expression & right_expression
        // end scope

        this._emitter.start_scope();

        var left_expression = this.visit(get_left_child(node));
        var is_nested_expression = get_right_child(node).type === 'expression';
        left_expression = this._emitter.left_expression(node, left_expression, is_nested_expression);

        var right_expression = this.visit(get_right_child(node));
        var full_expression = this._emitter.full_expression(node, right_expression, left_expression);
        this._emitter.end_scope();

        
        return this._emitter.result(node, full_expression);
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

class L3Emitter extends L2Emitter{
    left_expression (node, left_expression, is_nested_expression ){
        if (is_nested_expression) {
            this.create_temp_var_with_content(get_left_child(node), 'u8', left_expression);;
            return left_expression = this.read_temp_var(`${this.frame_pointer}`)
        }
        // Else we can just write it directly into $x
        else {
            this.assignment(get_left_child(node), false, new Content(CONTENT_TYPES.REGISTER, '$x'), left_expression);
            return left_expression = this.register('$x');
        }
    }

    full_expression (node, right_expression, left_expression) {
        // If it is a binary assignment we have to save the right expression in a register before combining it with the left expression
        if (get_opcode(right_expression) === OP.ASSIGN_BIN) {
            this.assignment(get_right_child(node), false, new Content(CONTENT_TYPES.REGISTER, '$x'), right_expression);
            return new Expression(CONTENT_TYPES.BIN_EXPRESSION, left_expression, get_operator(node).text, new Content(CONTENT_TYPES.REGISTER, '$x'));
        } else {
            return new Expression(CONTENT_TYPES.BIN_EXPRESSION, left_expression, get_operator(node).text, right_expression);
        }
    }

    result(node, full_expression){
        // If we are out of the scope we know we have handled the entire expression and we can save the final expression in $x and return $x to the caller (assignment)
        if (!this.in_scope) {
            this.assignment(node, false, new Content(CONTENT_TYPES.REGISTER, '$x'), full_expression);
            return new Expression(CONTENT_TYPES.EXPRESSION, new Content(CONTENT_TYPES.REGISTER, '$x'));
        }else{
            return full_expression;
        }
    }

    // Copy of L2 function that takes an already handled expression as input
    // We need to be able to set a temp variable to a content object rather than a tree-sitter node
    create_temp_var_with_content(node, var_size, content_expression) {
        var variable_size = get_variable_bytesize(var_size);
        this.frame_pointer -= variable_size;
        this.head.variables[this.frame_pointer] = [this.stack_pointer - this.frame_pointer, var_size];
        var writer = this.read_temp_var(this.frame_pointer);
        this.assignment(node, false, writer, content_expression);
    }
}