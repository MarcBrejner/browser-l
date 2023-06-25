class L3Visitor extends L2Visitor {
    expression(node) {
        // if the expression does not contain any sub-expressions it should be sent down to L0 instead of being handled here.
        if (!this.has_sub_expression(node)) {
            //node_stack.push(node);
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

        var left_child = get_left_child(node);
        var right_child = get_right_child(node);

        //Handle left side
        this._emitter.node_stack.push(left_child);
        var left_expression = this.visit(left_child);
        
        var is_nested_expression = right_child.type === 'expression';
        left_expression = this._emitter.left_expression(left_expression, is_nested_expression);

        //Handle right side
        var right_expression = this.visit(right_child);
        if(this.is_binary_expression(right_child)){
            this._emitter.node_stack.push(right_child);
            this._emitter.save_to_register_x(right_expression)
        }

        //Sum both sides
        this._emitter.node_stack.push(node)
        var operator = get_operator(node).text;
        var full_expression = this._emitter.full_expression(left_expression, operator, right_expression);
        this._emitter.end_scope();

        var result = this._emitter.result(full_expression);
        if(!this._emitter.in_scope){
            this.clean_stack()
        }
        return result;
    }

    has_sub_expression(expression) {
        for (var i = 0; i < expression.childCount; i++) {
            if (expression.child(i).type === 'expression') {
                return true;
            } 
        }
        return false;
    }

    is_binary_expression(node){
        return node.childCount >= 3;
    }

    clean_stack(){
        while(this._emitter.node_stack.peek().type !== 'statement'){
            this._emitter.node_stack.pop()
        }
    }
}

class L3Emitter extends L2Emitter{
    constructor() {
        super();
        this._step_draw['L3'] = L3Draw;
        this._step_draw_state['L3'] = null;
    }

    left_expression (left_expression, is_nested_expression ){
        if (is_nested_expression) {
            var bytesize = 'u8';
            this.create_temp_var(this.frame_pointer - get_variable_bytesize(bytesize), bytesize, left_expression);
            return this.read_temp_var(`${this.frame_pointer}`);
        }
        // Else we can just write it directly into $x
        else {
            this.save_to_register_x(left_expression);
            return this.register('$x');
        }
    }

    save_to_register_x(expression){
        this.assignment(false, this.register('$x'), expression, L3Draw,[]);
    }

    full_expression(left_expression, operator, right_expression) {
        // If it is a binary assignment we have to save the right expression in a register before combining it with the left expression
        if (get_opcode(right_expression) === OP.ASSIGN_BIN) {
            return this.binary_expression(left_expression, operator, this.register('$x'));
        } else {
            return this.binary_expression(left_expression, operator, right_expression);
        }
    }

    result(full_expression){
        // If we are out of the scope we know we have handled the entire expression and we can save the final expression in $x and return $x to the caller (assignment)
        if (!this.in_scope) {
            this.save_to_register_x(full_expression);
            return this.expression(this.register('$x'));
        }else{
            return full_expression;
        }
    }
}

class L3Draw extends L2Draw {
    constructor(){
        super();
    }

    draw(vm) {
        super.draw(vm);
        return;
    }
}