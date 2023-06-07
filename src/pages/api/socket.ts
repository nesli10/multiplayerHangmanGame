import { NextApiRequest } from "next";
import { Server as ServerIO } from "socket.io";
import wordsData from "words.json";

export const config = {
  api: {
    bodyParser: false,
  },
};

const generateWord = () => {
  const randomIndex = Math.floor(Math.random() * wordsData.words.length);
  const randomWord = wordsData.words[randomIndex].toLowerCase();
  return randomWord;
};
const generateRoomId = () => {
  const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const roomIdLength = 6; // Oluşturulacak room ID'sinin uzunluğu

  let roomId = "";
  for (let i = 0; i < roomIdLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    roomId += characters[randomIndex];
  }

  return roomId;
};

const socket = async (req: NextApiRequest, res: any) => {
  if (!res.socket.server.io) {
    const io = new ServerIO(res.socket.server, {
      addTrailingSlash: false,
    });

    const onConnection = (socket: any) => {
      socket.on(
        "joinRoom",
        ({ username }: any, callback: (arg0: boolean) => void) => {
          const connectedSockets = socket.nsp.sockets;
          const socketObjects = Array.from(connectedSockets); //arraya çevirme
          const waitForSecondPlayer: any = socketObjects.filter(
            (socketData: any) => socketData[1].data?.isWait
          )[0]; // bekleyen oyuncuyu bulur
          let room = generateRoomId();
          let isWait = true; //2.oyuncuyu beklemek için
          if (waitForSecondPlayer) {
            socket.nsp.sockets.get(waitForSecondPlayer[0]).data.isWait = false; //2.oyuncu artık beklenmiyor
            room = waitForSecondPlayer[1].data.room; //var olan odaya katıldı
            isWait = false; //başka beklenen oyuncu yok
          }
          if (socket.adapter.rooms.get(room)?.size ?? 0 < 2) {
            socket.join(room);
          } else {
            callback(false);
            return;
          }
          //console.log(socket.adapter.rooms); //odalar
          //console.log(socket.adapter.rooms.get(room)?.size);
          // console.log(socket.nsp.sockets); //bağlı kullanıcılar
          const random = Math.floor(Math.random() * 9000 + 1000);
          username = username + "#" + random;
          socket.data = { username, score: 0, room, isWait }; //user dataları
          if (socket.adapter.rooms.get(room)?.size == 2) {
            const word = generateWord();
            const opponentId: any = Array.from(
              socket.adapter.rooms.get(room) ?? []
            ).filter((user: any) => user !== socket.id)[0]; // odadaki diğer kişileri bulur
            const opponent = socket.nsp.sockets.get(opponentId);
            socket.to(room).emit("gameStarted", {
              room,
              word,
              opponent: socket.data.username,
            });
            socket.emit("gameStarted", {
              room,
              word,
              opponent: opponent.data.username,
            });
          }
          callback(true); //odaya katılım başarılı
        }
      );

      socket.on(
        "guessMade",
        ({ room, score, remainingAttempts, word, guesses }: any) => {
          socket.data.score = score;
          const opponentId: any = Array.from(
            socket.adapter.rooms.get(room) ?? []
          ).filter((user: any) => user !== socket.id)[0];
          socket.to(opponentId).emit("opponentGuessMade", {
            opponentScore: score,
          }); //karşı tarafın tahmin için
          const isGameWon = word
            .split("")
            .every((letter: any) => guesses.includes(letter));
          if (isGameWon) {
            // Kelime tamamen doğru tahmin edildi
            socket.emit("gameOver", { result: "win", score: score, word });
            const opponentScore =
              socket.nsp.sockets.get(opponentId)?.data.score;
            socket
              .to(opponentId)
              .emit("gameOver", { result: "lose", score: opponentScore, word });
          } else if (remainingAttempts === 0) {
            socket.data.remainingAttempts = 0;
            const opponentId = Array.from(
              socket.adapter.rooms.get(room) ?? []
            ).find((user) => user !== socket.id);
            const opponentScore =
              socket.nsp.sockets.get(opponentId)?.data.score;

            if (score > opponentScore) {
              socket.emit("gameOver", { result: "win", score: score, word });
              socket.to(opponentId).emit("gameOver", {
                result: "lose",
                score: opponentScore,
                word,
              });
            } else if (score < opponentScore) {
              socket.emit("gameOver", { result: "lose", score: score, word });
              socket.to(opponentId).emit("gameOver", {
                result: "win",
                score: opponentScore,
                word,
              });
            } else {
              socket.emit("gameOver", { result: "draw", score: score, word });
              socket.to(opponentId).emit("gameOver", {
                result: "draw",
                score: opponentScore,
                word,
              });
            }
          }
        }
      );
    };

    res.socket.server.io = io;
    io.on("connection", onConnection);
  }

  res.end();
};
export default socket;
