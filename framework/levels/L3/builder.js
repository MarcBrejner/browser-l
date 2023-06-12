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
            if (node.childCount === 3) {
                this.create_temp_var(node, `_t${this.number_of_temp_var}`, 'u8', node.child(0));
                this.number_of_temp_var++;
                this.create_temp_var(node, `_t${this.number_of_temp_var}`, 'u8', node.child(2));
                this.number_of_temp_var++;
                return new Expression(CONTENT_TYPES.BIN_EXPRESSION, this.read_temp_var(`_t${this.number_of_temp_var-2}`), node.child(1).text ,this.read_temp_var(`_t${this.number_of_temp_var-1}`));
            } else {
                this.create_temp_var(node, `_t${this.number_of_temp_var}`, 'u8', node.child(1));
                this.number_of_temp_var++;
                this.create_temp_var(node, `_t${this.number_of_temp_var}`, 'u8', node.child(5));
                this.number_of_temp_var++;
                return new Expression(CONTENT_TYPES.BIN_EXPRESSION, this.read_temp_var(`_t${this.number_of_temp_var-2}`), node.child(3).text ,this.read_temp_var(`_t${this.number_of_temp_var-1}`));
            }
        } else {
            return super.handle(node);
        }
    }

    number_of_temp_var = 0;
}