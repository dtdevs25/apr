import re

with open('init.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace '' with NULL in SQL INSERTS
content = re.sub(r",\s*''", ', NULL', content)
content = re.sub(r"\(\s*''", '(NULL', content)
content = re.sub(r"''\s*\)", 'NULL)', content)

with open('init.sql', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done fixing init.sql')
