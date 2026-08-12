// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BaseTacToe {
    uint8 private constant EMPTY = 0;
    uint8 private constant PLAYER = 1;
    uint8 private constant BOT = 2;

    uint8 public constant STATUS_NONE = 0;
    uint8 public constant STATUS_ACTIVE = 1;
    uint8 public constant STATUS_PLAYER_WON = 2;
    uint8 public constant STATUS_BOT_WON = 3;
    uint8 public constant STATUS_DRAW = 4;

    struct Game {
        uint8[9] board;
        uint8 status;
        uint8 playerMoves;
        uint8 botMoves;
        uint32 gameNumber;
        uint64 lastActionAt;
    }

    struct Stats {
        uint64 games;
        uint64 wins;
        uint64 losses;
        uint64 draws;
        uint64 totalMoves;
        uint64 checkIns;
        uint64 lastCheckInDay;
        uint16 streak;
    }

    mapping(address => Game) private games;
    mapping(address => Stats) private playerStats;

    uint64 public globalGames;
    uint64 public globalMoves;
    uint64 public globalCheckIns;

    event GameStarted(address indexed player, uint32 indexed gameNumber);
    event MovePlayed(
        address indexed player,
        uint32 indexed gameNumber,
        uint8 playerCell,
        uint8 botCell,
        uint8 status
    );
    event DailyCheckIn(address indexed player, uint64 indexed day, uint16 streak);

    function startGame() external {
        Game storage game = games[msg.sender];
        require(game.status != STATUS_ACTIVE, "Finish the current game");

        uint32 nextNumber = game.gameNumber + 1;
        delete games[msg.sender];

        Game storage freshGame = games[msg.sender];
        freshGame.status = STATUS_ACTIVE;
        freshGame.gameNumber = nextNumber;
        freshGame.lastActionAt = uint64(block.timestamp);

        playerStats[msg.sender].games += 1;
        globalGames += 1;

        emit GameStarted(msg.sender, nextNumber);
    }

    function play(uint8 cell) external {
        Game storage game = games[msg.sender];
        require(game.status == STATUS_ACTIVE, "Start a game first");
        require(cell < 9, "Cell outside board");
        require(game.board[cell] == EMPTY, "Cell already taken");

        game.board[cell] = PLAYER;
        game.playerMoves += 1;
        game.lastActionAt = uint64(block.timestamp);
        playerStats[msg.sender].totalMoves += 1;
        globalMoves += 1;

        if (_hasWon(game.board, PLAYER)) {
            game.status = STATUS_PLAYER_WON;
            playerStats[msg.sender].wins += 1;
            emit MovePlayed(msg.sender, game.gameNumber, cell, type(uint8).max, game.status);
            return;
        }

        if (_isFull(game.board)) {
            game.status = STATUS_DRAW;
            playerStats[msg.sender].draws += 1;
            emit MovePlayed(msg.sender, game.gameNumber, cell, type(uint8).max, game.status);
            return;
        }

        uint8 botCell = _chooseBotCell(game.board, msg.sender, game.gameNumber);
        game.board[botCell] = BOT;
        game.botMoves += 1;

        if (_hasWon(game.board, BOT)) {
            game.status = STATUS_BOT_WON;
            playerStats[msg.sender].losses += 1;
        } else if (_isFull(game.board)) {
            game.status = STATUS_DRAW;
            playerStats[msg.sender].draws += 1;
        }

        emit MovePlayed(msg.sender, game.gameNumber, cell, botCell, game.status);
    }

    function dailyCheckIn() external {
        uint64 day = uint64(block.timestamp / 1 days);
        Stats storage stats = playerStats[msg.sender];
        require(stats.lastCheckInDay != day, "Already checked in today");

        if (stats.lastCheckInDay + 1 == day) {
            if (stats.streak < type(uint16).max) stats.streak += 1;
        } else {
            stats.streak = 1;
        }

        stats.lastCheckInDay = day;
        stats.checkIns += 1;
        globalCheckIns += 1;

        emit DailyCheckIn(msg.sender, day, stats.streak);
    }

    function gameOf(address player) external view returns (Game memory) {
        return games[player];
    }

    function statsOf(address player) external view returns (Stats memory) {
        return playerStats[player];
    }

    function _chooseBotCell(
        uint8[9] memory board,
        address player,
        uint32 gameNumber
    ) private pure returns (uint8) {
        (bool canWin, uint8 winningCell) = _findTacticalMove(board, BOT);
        if (canWin) return winningCell;

        (bool mustBlock, uint8 blockingCell) = _findTacticalMove(board, PLAYER);
        if (mustBlock) return blockingCell;

        if (board[4] == EMPTY) return 4;

        uint8[4] memory corners = [uint8(0), 2, 6, 8];
        uint8 offset = uint8(uint256(keccak256(abi.encodePacked(player, gameNumber))) % 4);
        for (uint8 i = 0; i < 4; i++) {
            uint8 corner = corners[(i + offset) % 4];
            if (board[corner] == EMPTY) return corner;
        }

        for (uint8 i = 0; i < 9; i++) {
            if (board[i] == EMPTY) return i;
        }

        revert("No move available");
    }

    function _findTacticalMove(
        uint8[9] memory board,
        uint8 mark
    ) private pure returns (bool, uint8) {
        for (uint8 i = 0; i < 9; i++) {
            if (board[i] != EMPTY) continue;
            board[i] = mark;
            if (_hasWon(board, mark)) return (true, i);
            board[i] = EMPTY;
        }
        return (false, 0);
    }

    function _hasWon(uint8[9] memory board, uint8 mark) private pure returns (bool) {
        return
            (board[0] == mark && board[1] == mark && board[2] == mark) ||
            (board[3] == mark && board[4] == mark && board[5] == mark) ||
            (board[6] == mark && board[7] == mark && board[8] == mark) ||
            (board[0] == mark && board[3] == mark && board[6] == mark) ||
            (board[1] == mark && board[4] == mark && board[7] == mark) ||
            (board[2] == mark && board[5] == mark && board[8] == mark) ||
            (board[0] == mark && board[4] == mark && board[8] == mark) ||
            (board[2] == mark && board[4] == mark && board[6] == mark);
    }

    function _isFull(uint8[9] memory board) private pure returns (bool) {
        for (uint8 i = 0; i < 9; i++) {
            if (board[i] == EMPTY) return false;
        }
        return true;
    }
}
