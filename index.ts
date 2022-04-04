import { handler } from "./handler";
import dns2 = require("dns2");

const server = dns2.createServer({
  udp: true,
  tcp: true,
  handle: handler,
});

server.on(
  "request",
  (request: {
    header: {
      id: number;
    };
    questions: { name: string; type: number; class: number }[];
  }) => {
    console.log(request.header.id, request.questions[0]);
  }
);

server.on("listening", () => {
  console.log("listening");
});

server.on("close", () => {
  console.log("server closed");
});

server.listen({
  udp: 53,
  tcp: 53,
});

// eventually
// server.close();
