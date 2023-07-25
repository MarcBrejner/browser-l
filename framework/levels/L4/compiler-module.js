class L4Visitor extends L3Visitor {
    if(node) {
        this._emitter.number_of_if++;
        this._emitter.current_if.push(this._emitter.number_of_if);
        var guard_expression = this.visit(node.child(2));
        var has_else = this.has_else(node);
        this._emitter.node_stack.push(node.child(2))    // Push guard expression for highlight
        this._emitter.start_if(guard_expression, has_else);
        this._emitter.node_stack.pop();
        this.visit(node.child(4));
        this._emitter.node_stack.push(node.child(2));   // Highlight guard after the if statements
        this._emitter.end_if(has_else)
        this._emitter.node_stack.pop();
        if (has_else) {
            this.visit(node.child(5))
        }
        this._emitter.current_if.pop();
    }

    else(node) {
        this._emitter.start_else();
        this.visit(node.child(1));
        this._emitter.end_else();
    }

    while(node) {
        this._emitter.number_of_while++;
        this._emitter.current_while.push(this._emitter.number_of_while);
        var guard_expression = this.visit(node.child(2));
        this._emitter.node_stack.push(node.child(2));
        this._emitter.start_while();
        this._emitter.node_stack.pop();
        this.visit(node.child(4));
        this._emitter.node_stack.push(node.child(2));
        this._emitter.end_while(guard_expression);
        this._emitter.node_stack.pop();
        this._emitter.current_while.pop();
    }

    for(node) {
        this._emitter.number_of_for++;
        this._emitter.current_for.push(this._emitter.number_of_for);
        this._emitter.start_scope();
        this._emitter.node_stack.push(node.child(2));
        this.visit(node.child(2));  // declare the variable used as accumulator
        this._emitter.start_for();
        this._emitter.node_stack.pop();
        this.visit(node.child(8));  // visit statements inside forloop

        var condition = this.visit(node.child(4));
        var acc_var_name = node.child(2).child(0).text;
        var acc_var_size = node.child(2).child(2).text;
        var incrementor = this.visit(node.child(6));
        this._emitter.node_stack.push(node.child(6));
        this._emitter.for_increment_acc(acc_var_name, acc_var_size, incrementor);
        this._emitter.node_stack.pop();
        this._emitter.node_stack.push(node.child(4));
        this._emitter.end_for(condition);
        this._emitter.node_stack.pop();
        this._emitter.end_scope();
        this._emitter.current_for.pop();
    }

    has_else(node) {
        var has_else = false;
        node.children.forEach(c => {
            if (c.type === "else") {
                has_else = true;
            }
        })
        return has_else;
    }
}

class L4Emitter extends L3Emitter{
    start_if(guard_expression, has_else) {
        this.assignment(this.register('$?'), guard_expression, false, true);
        if (has_else) {
            this.goto(this.get_label(`#ELSE_${this.current_if.peek()}`))
        } else {
            this.goto(this.get_label(`#END_IF_${this.current_if.peek()}`))
        }
    }

    end_if(has_else) {
        if (has_else) {
            this.goto(this.get_label(`#END_IF_${this.current_if.peek()}`), false)
        } else {
            this.set_label(`#END_IF_${this.current_if.peek()}`)
        }
    }

    start_while() {
        this.goto(this.get_label(`#WHILE_GUARD_${this.current_while.peek()}`), false);
        this.set_label(`#WHILE_CONTENT_${this.current_while.peek()}`);   
    }

    end_while(guard_expression) {
        this.set_label(`#WHILE_GUARD_${this.current_while.peek()}`);
        this.assignment(this.register('$?'), guard_expression, false, false);
        this.goto(this.get_label(`#WHILE_CONTENT_${this.current_while.peek()}`))
    }

    start_for () {
        this.goto(this.get_label(`#FOR_GUARD_${this.current_for.peek()}`), false);
        this.set_label(`#FOR_CONTENT_${this.current_for.peek()}`);  
    }

    for_increment_acc(var_name, var_size, expression) {
        this.variable(var_name, var_size, expression);
    }

    end_for(condition) {
        this.set_label(`#FOR_GUARD_${this.current_for.peek()}`);
        this.assignment(this.register('$?'), condition, false, false);
        this.goto(this.get_label(`#FOR_CONTENT_${this.current_for.peek()}`));
    }

    start_else() {
        this.set_label(`#ELSE_${this.current_if.peek()}`)
    }

    end_else() {
        this.set_label(`#END_IF_${this.current_if.peek()}`)
    }

    number_of_if = 0;

    number_of_while = 0;

    number_of_for = 0;

    current_for= {
        items: [],
    
        push(element)
        {
            this.items.push(element);
        },
    
        pop()
        {
            if (this.items.length == 0)
                return "Underflow";
            return this.items.pop();
        },

        peek(){
            return this.items[this.items.length-1];
        }
    }

    current_while= {
        items: [],
    
        push(element)
        {
            this.items.push(element);
        },
    
        pop()
        {
            if (this.items.length == 0)
                return "Underflow";
            return this.items.pop();
        },

        peek(){
            return this.items[this.items.length-1];
        }
    }

    current_if = {
        items: [],
    
        push(element)
        {
            this.items.push(element);
        },
    
        pop()
        {
            if (this.items.length == 0)
                return "Underflow";
            return this.items.pop();
        },

        peek(){
            return this.items[this.items.length-1];
        }
    }
}

class L4Draw extends L3Draw {
    constructor(){
        super();
    }

    draw(vm) {
        super.draw(vm);
        return;
    }
}