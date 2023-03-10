/* eslint-disable key-spacing */
import { emojiRegex } from './emoji-regex.js';
import { fetchMeta } from './fetch-meta.js';
import { Emojis } from '@/models/index.js';
import { toPunyNullable } from './convert-host.js';
import { IsNull } from 'typeorm';

const legacies: Record<string, string> = {
	'like':     'ð',
	'love':     'â¤', // ããã«è¨è¿°ããå ´åã¯ç°ä½å­ã»ã¬ã¯ã¿ãå¥ããªã
	'laugh':    'ð',
	'hmm':      'ð¤',
	'surprise': 'ð®',
	'congrats': 'ð',
	'angry':    'ð¢',
	'confused': 'ð¥',
	'rip':      'ð',
	'pudding':  'ð®',
	'star':     'â­',
};

export async function getFallbackReaction(): Promise<string> {
	const meta = await fetchMeta();
	return meta.useStarForReactionFallback ? 'â­' : 'ð';
}

export function convertLegacyReactions(reactions: Record<string, number>) {
	const _reactions = {} as Record<string, number>;

	for (const reaction of Object.keys(reactions)) {
		if (reactions[reaction] <= 0) continue;

		if (Object.keys(legacies).includes(reaction)) {
			if (_reactions[legacies[reaction]]) {
				_reactions[legacies[reaction]] += reactions[reaction];
			} else {
				_reactions[legacies[reaction]] = reactions[reaction];
			}
		} else {
			if (_reactions[reaction]) {
				_reactions[reaction] += reactions[reaction];
			} else {
				_reactions[reaction] = reactions[reaction];
			}
		}
	}

	const _reactions2 = {} as Record<string, number>;

	for (const reaction of Object.keys(_reactions)) {
		_reactions2[decodeReaction(reaction).reaction] = _reactions[reaction];
	}

	return _reactions2;
}

export async function toDbReaction(reaction?: string | null, reacterHost?: string | null): Promise<string> {
	if (reaction == null) return await getFallbackReaction();

	reacterHost = toPunyNullable(reacterHost);

	// æå­åã¿ã¤ãã®ãªã¢ã¯ã·ã§ã³ãçµµæå­ã«å¤æ
	if (Object.keys(legacies).includes(reaction)) return legacies[reaction];

	// Unicodeçµµæå­
	const match = emojiRegex.exec(reaction);
	if (match) {
		// åå­ãå«ã1ã¤ã®çµµæå­
		const unicode = match[0];

		// ç°ä½å­ã»ã¬ã¯ã¿é¤å»
		return unicode.match('\u200d') ? unicode : unicode.replace(/\ufe0f/g, '');
	}

	const custom = reaction.match(/^:([\w+-]+)(?:@\.)?:$/);
	if (custom) {
		const name = custom[1];
		const emoji = await Emojis.findOneBy({
			host: reacterHost ?? IsNull(),
			name,
		});

		if (emoji) return reacterHost ? `:${name}@${reacterHost}:` : `:${name}:`;
	}

	return await getFallbackReaction();
}

type DecodedReaction = {
	/**
	 * ãªã¢ã¯ã·ã§ã³å (Unicode Emoji or ':name@hostname' or ':name@.')
	 */
	reaction: string;

	/**
	 * name (ã«ã¹ã¿ã çµµæå­ã®å ´åname, Emojiã¯ã¨ãªã«ä½¿ã)
	 */
	name?: string;

	/**
	 * host (ã«ã¹ã¿ã çµµæå­ã®å ´åhost, Emojiã¯ã¨ãªã«ä½¿ã)
	 */
	host?: string | null;
};

export function decodeReaction(str: string): DecodedReaction {
	const custom = str.match(/^:([\w+-]+)(?:@([\w.-]+))?:$/);

	if (custom) {
		const name = custom[1];
		const host = custom[2] || null;

		return {
			reaction: `:${name}@${host || '.'}:`,	// ã­ã¼ã«ã«åã¯@ä»¥éãçç¥ããã®ã§ã¯ãªã.ã«ãã
			name,
			host,
		};
	}

	return {
		reaction: str,
		name: undefined,
		host: undefined,
	};
}

export function convertLegacyReaction(reaction: string): string {
	reaction = decodeReaction(reaction).reaction;
	if (Object.keys(legacies).includes(reaction)) return legacies[reaction];
	return reaction;
}
