class L1Builder extends L0Builder {

    handle(node) {
        if (node.type === "goto") {
            this.goto(node.child(1));
        } else {
            return super.handle(node);
        }
    }

    goto(reader) {
        var _reader1;
        if (reader.type === "label") {
            _reader1 = new Reader(RT.LABEL, reader.text);
        } else if (reader.type === "register") {
            _reader1 = new Reader(RT.REGISTER, reader.text);
        }
        var _reader2 = new Reader(RT.NUMBER, 1);
        var _writer = new Writer(WT.REGISTER, '$!');
        this.statements.push(new ByteCode(OP.ASSIGN_BIN, [true, _writer, _reader1, '-', _reader2]));
    }
}