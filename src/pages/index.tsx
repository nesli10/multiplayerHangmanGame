import { useState } from "react";
import styles from "../styles/Hangman.module.css";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import io, { Socket } from "socket.io-client";

const Game = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [room, setRoom] = useState("");
  const [username, setUsername] = useState("");
  const [waitingForSecondPlayer, setWaitingForSecondPlayer] = useState(false);
  const [word, setWord] = useState("");
  const [guesses, setGuesses] = useState<any[]>([]);
  const [remainingAttempts, setRemainingAttempts] = useState(6);
  const [score, setScore] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [opponentUsername, setOpponentUsername] = useState("");
  const [opponentScore, setOpponentScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const handleUsernameChange = (event: any) => {
    setUsername(event.target.value);
  };

  const joinRoom = () => {
    if (username) {
      socketInitializer();
    }
  };

  async function socketInitializer() {
    await fetch("/api/socket");

    const socket = io();

    socket.emit("joinRoom", { username }, (success: boolean) => {
      if (success) {
        setWaitingForSecondPlayer(true);
        setSocket(socket);
      } else {
        alert("Failed to join the room. Please try again.");
      }
    });

    socket.on(
      "gameStarted",
      ({
        room,
        word,
        opponent,
      }: {
        room: string;
        word: string;
        opponent: string;
      }) => {
        setRoom(room);
        //console.log(word, { opponent, room });
        setGameStarted(true);
        setWaitingForSecondPlayer(false);
        setWord(word.toLowerCase());
        setOpponentUsername(opponent);
      }
    );

    socket.on("opponentGuessMade", ({ opponentScore }) => {
      setOpponentScore(opponentScore);
    });
    socket.on("gameOver", ({ result, word }) => {
      setGameOver(true);
      if (result === "win") {
        alert("Tebrikler, oyunu kazandınız!  ");
      } else if (result === "lose") {
        alert("Maalesef, oyunu kaybettiniz. Doğru kelime: " + word);
      } else if (result === "draw") {
        alert("Oyun berabere sonuçlandı.");
      }
    });
  }

  const handleGuess = (letter: any, event: any) => {
    const lowercaseLetter = letter.toLowerCase();
    const sendGuesses = [...guesses, lowercaseLetter];
    setGuesses(sendGuesses);

    let updatedScore = score;
    let updatedAttempts = remainingAttempts;

    if (word.includes(lowercaseLetter)) {
      updatedScore += 10;
      event.target.disabled = "disabled";
      event.currentTarget.setAttribute("founded", "founded");
      setScore(updatedScore);
    } else {
      updatedScore -= 10;
      updatedAttempts -= 1;
      setRemainingAttempts(updatedAttempts);
      setScore(updatedScore);
      event.target.disabled = "disabled";
    }
    if (socket) {
      socket.emit("guessMade", {
        letter,
        room,
        username,
        score: updatedScore,
        word,
        remainingAttempts: updatedAttempts,
        guesses: sendGuesses,
      });
    }
  };

  const renderWord = () => {
    if (gameStarted && word) {
      return word
        .split("")
        .map((letter, index) => (
          <span key={index}>{guesses.includes(letter) ? letter : "_"}</span>
        ));
    }

    return null;
  };

  const renderHangman = () => {
    const wrongGuesses = guesses.filter(
      (guess) => !word.includes(guess)
    ).length;
    const imagePath = `./images/hangman_${wrongGuesses}.jpg`;
    return (
      <div className={styles.hangman_container}>
        <picture>
          <img
            src={imagePath}
            alt={`Hangman ${wrongGuesses}`}
            className={styles.hangman_image}
          />
        </picture>
        <p className={styles.remaining_attempts}>
          Remaining Attempts: {remainingAttempts}
        </p>
      </div>
    );
  };

  const alphabet = "abcdefghijklmnopqrstuvwxyz";

  const renderButtons = () => {
    return alphabet.split("").map((letter) => (
      <button
        className={styles.word_button}
        key={letter}
        onClick={(e) => handleGuess(letter, e)}
        disabled={
          guesses.includes(letter) || remainingAttempts <= 0 || gameOver
        }
      >
        {letter}
      </button>
    ));
  };

  const handleRestart = () => {
    setRoom("");
    setGuesses([]);
    setRemainingAttempts(6);
    setScore(0);
    setWord("");
    setOpponentScore(0);
    setGameStarted(false);
    setUsername("");
    setWaitingForSecondPlayer(false);

    const wordButtons = document.querySelectorAll(
      `.${styles.word_button}[founded]`
    );
    wordButtons.forEach((button) => {
      button.removeAttribute("founded");
    });
    window.location.reload();
  };

  return (
    <div className={styles.hangman_game}>
      <h1>Hangman Game</h1>
      {!gameStarted ? (
        <div style={{ paddingTop: "40px" }}>
          <TextField
            id="outlined-basic"
            value={username}
            onChange={handleUsernameChange}
            label="Enter your username"
            variant="outlined"
          />

          <Button
            style={{ margin: "15px" }}
            variant="contained"
            onClick={joinRoom}
          >
            Join Room
          </Button>

          {waitingForSecondPlayer && <p>Waiting for the second player...</p>}
        </div>
      ) : (
        <div>
          <div style={{ marginRight: "40rem" }}>
            <h2>Welcome, {username}</h2>
            <p className={styles.score}>Score: {score}</p>
          </div>
          <div
            style={{
              marginLeft: "40rem",
              position: "relative",
              bottom: "5.6rem",
            }}
          >
            <h3>Opponent: {opponentUsername}</h3>
            <h3>Opponent's Score: {opponentScore}</h3>
          </div>
          {renderHangman()}
          <p className={styles.word_display}>{renderWord()}</p>
          <div className={styles.button_container}>{renderButtons()}</div>
          <button className={styles.restart_button} onClick={handleRestart}>
            Restart
          </button>
        </div>
      )}
    </div>
  );
};

export default Game;
