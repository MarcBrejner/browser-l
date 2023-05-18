class L0Builder {
    declarations = {};
    statements = {};

    handle(statement, rec) {
        if (statement.type === "assign") {
            assign(statement.assigntype, statement.writer, rec(statement.reader))
        }
    }

    assign(cond, writer, reader) {
        // statements.push(bytecode)
    }
}

class L1Builder extends L0Builder {

    handle(statement, rec) {
        if (statement.type === "goto") {
            goto(statement.label) 
        } else {
            super.handle(statement, this.handle())
        }
    }

    goto(label) {
        // statements.push(bytecode)
    }
}
