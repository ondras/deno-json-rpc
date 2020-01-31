DENO := ../../deno/deno_linux_x64

all: client.js

client.js: client.ts
	$(DENO) bundle $^ > $@

run:
	$(DENO) --allow-net server.ts 1234
