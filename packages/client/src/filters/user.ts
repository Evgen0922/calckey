import * as misskey from 'calckey-js';
import * as Acct from 'calckey-js/built/acct';
import { url } from '@/config';

export const acct = (user: misskey.Acct) => {
	return Acct.toString(user);
};

export const userName = (user: misskey.entities.User) => {
	return user.name || user.username;
};

export const userPage = (user: misskey.Acct, path?, absolute = false) => {
	return `${absolute ? url : ''}/@${acct(user)}${(path ? `/${path}` : '')}`;
};
