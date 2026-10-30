
const Database = require('better-sqlite3');

const db = new Database('levels.db');

db.exec(`
    CREATE TABLE IF NOT EXISTS user_levels (
        user_id TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        xp INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 0,
        UNIQUE(user_id, guild_id)
    )
`);

function getUserLevel(userId, guildId) {
    return db.prepare(`
        SELECT xp, level
        FROM user_levels
        WHERE user_id = ? AND guild_id = ?
    `).get(userId, guildId) || { xp: 0, level: 0 };
}

function addXP(userId, guildId, amount) {
    db.prepare(`
        INSERT INTO user_levels (user_id, guild_id, xp, level)
        VALUES (?, ?, ?, 0)
        ON CONFLICT(user_id, guild_id)
        DO UPDATE SET xp = xp + excluded.xp
    `).run(userId, guildId, amount);

    const user = getUserLevel(userId, guildId);

    const newLevel = Math.floor(
        (1 + Math.sqrt(1 + user.xp / 25)) / 2
    );

    if (newLevel > user.level) {
        db.prepare(`
            UPDATE user_levels
            SET level = ?
            WHERE user_id = ? AND guild_id = ?
        `).run(newLevel, userId, guildId);
    }

    return {
        xp: user.xp,
        level: newLevel,
        leveledUp: newLevel > user.level
    };
}

module.exports = { getUserLevel, addXP };
