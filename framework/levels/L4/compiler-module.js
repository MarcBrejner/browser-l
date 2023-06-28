class L4Visitor extends L3Visitor {
    if(node) {
        this._emitter.number_of_if++;
        this._emitter.current_if.push(this._emitter.number_of_if);
        var guard_expression = this.visit(node.child(2));
        var has_else = this.has_else(node);
        this._emitter.start_if(guard_expression, has_else);
        this.visit(node.child(4));
        this._emitter.end_if(has_else)
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
            this.goto(this.get_label(`#END_${this.current_if.peek()}`))
        }
    }

    end_if(has_else) {
        if (has_else) {
            this.assignment(this.register('$?'), this.number(1), false, false);
            this.goto(this.get_label(`#END_${this.current_if.peek()}`))
        } else {
            this.set_label(`#END_${this.current_if.peek()}`)
        }
    }

    start_else() {
        this.set_label(`#ELSE_${this.current_if.peek()}`)
    }

    end_else() {
        this.set_label(`#END_${this.current_if.peek()}`)
    }

    number_of_if = 0;

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