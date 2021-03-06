const isAndroid = Ti.Platform.osname === 'android';
const isIOS = !isAndroid && (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad');
const isWin32 = !isAndroid && !isIOS && Ti.Platform.name === 'windows';

const PosixConstants = {
	UV_UDP_REUSEADDR: 4,
	dlopen: {},
	errno: {
		E2BIG: 7,
		EACCES: 13,
		EADDRINUSE: 48,
		EADDRNOTAVAIL: 49,
		EAFNOSUPPORT: 47,
		EAGAIN: 35,
		EALREADY: 37,
		EBADF: 9,
		EBADMSG: 94,
		EBUSY: 16,
		ECANCELED: 89,
		ECHILD: 10,
		ECONNABORTED: 53,
		ECONNREFUSED: 61,
		ECONNRESET: 54,
		EDEADLK: 11,
		EDESTADDRREQ: 39,
		EDOM: 33,
		EDQUOT: 69,
		EEXIST: 17,
		EFAULT: 14,
		EFBIG: 27,
		EHOSTUNREACH: 65,
		EIDRM: 90,
		EILSEQ: 92,
		EINPROGRESS: 36,
		EINTR: 4,
		EINVAL: 22,
		EIO: 5,
		EISCONN: 56,
		EISDIR: 21,
		ELOOP: 62,
		EMFILE: 24,
		EMLINK: 31,
		EMSGSIZE: 40,
		EMULTIHOP: 95,
		ENAMETOOLONG: 63,
		ENETDOWN: 50,
		ENETRESET: 52,
		ENETUNREACH: 51,
		ENFILE: 23,
		ENOBUFS: 55,
		ENODATA: 96,
		ENODEV: 19,
		ENOENT: 2,
		ENOEXEC: 8,
		ENOLCK: 77,
		ENOLINK: 97,
		ENOMEM: 12,
		ENOMSG: 91,
		ENOPROTOOPT: 42,
		ENOSPC: 28,
		ENOSR: 98,
		ENOSTR: 99,
		ENOSYS: 78,
		ENOTCONN: 57,
		ENOTDIR: 20,
		ENOTEMPTY: 66,
		ENOTSOCK: 38,
		ENOTSUP: 45,
		ENOTTY: 25,
		ENXIO: 6,
		EOPNOTSUPP: 102,
		EOVERFLOW: 84,
		EPERM: 1,
		EPIPE: 32,
		EPROTO: 100,
		EPROTONOSUPPORT: 43,
		EPROTOTYPE: 41,
		ERANGE: 34,
		EROFS: 30,
		ESPIPE: 29,
		ESRCH: 3,
		ESTALE: 70,
		ETIME: 101,
		ETIMEDOUT: 60,
		ETXTBSY: 26,
		EWOULDBLOCK: 35,
		EXDEV: 18
	},
	signals: {
		SIGHUP: 1,
		SIGINT: 2,
		SIGQUIT: 3,
		SIGILL: 4,
		SIGTRAP: 5,
		SIGABRT: 6,
		SIGIOT: 6,
		SIGBUS: 10,
		SIGFPE: 8,
		SIGKILL: 9,
		SIGUSR1: 30,
		SIGSEGV: 11,
		SIGUSR2: 31,
		SIGPIPE: 13,
		SIGALRM: 14,
		SIGTERM: 15,
		SIGCHLD: 20,
		SIGCONT: 19,
		SIGSTOP: 17,
		SIGTSTP: 18,
		SIGTTIN: 21,
		SIGTTOU: 22,
		SIGURG: 16,
		SIGXCPU: 24,
		SIGXFSZ: 25,
		SIGVTALRM: 26,
		SIGPROF: 27,
		SIGWINCH: 28,
		SIGIO: 23,
		SIGINFO: 29,
		SIGSYS: 12
	},
	priority: {
		PRIORITY_LOW: 19,
		PRIORITY_BELOW_NORMAL: 10,
		PRIORITY_NORMAL: 0,
		PRIORITY_ABOVE_NORMAL: -7,
		PRIORITY_HIGH: -14,
		PRIORITY_HIGHEST: -20
	}
};

// default implementations
const OS = {
	EOL: '\n',
	arch: () => process.arch,
	constants: PosixConstants,
	cpus: () => {
		const count = Ti.Platform.processorCount;
		const array = [];
		for (let i = 0; i < count; i++) {
			array.push({
				model: 'unknown',
				speed: 0,
				times: {
					user: 0,
					nice: 0,
					sys: 0,
					idle: 0,
					irq: 0
				}
			});
		}
		return array;
	},
	endianness: () => {
		// TODO: Cache the value!
		const result = Ti.Codec.getNativeByteOrder();
		if (result === Ti.Codec.LITTLE_ENDIAN) {
			return 'LE';
		}
		return 'BE';
	},
	freemem: () => Ti.Platform.availableMemory,
	getPriority: () => 0, // fake it
	homedir: () => Ti.Filesystem.applicationDataDirectory, // fake it
	hostname: () => Ti.Platform.address || '', // fake it
	loadavg: () => [ 0, 0, 0 ], // fake it
	networkInterfaces: () => {}, // FIXME: What do we do here? We might be able to piece some of this together using Ti.Platform.netmask, Ti.Platform.address
	platform: () => process.platform,
	release: () => Ti.Platform.version,
	setPriority: () => {}, // no-op, fake it
	/**
	 * The `os.tmpdir()` method returns a string specifying the operating system's default directory for temporary files.
	 * @return {string} [description]
	 */
	tmpdir: () => Ti.Filesystem.tempDirectory,
	/**
	 * The `os.totalmem()` method returns the total amount of system memory in bytes as an integer.
	 * @return {integer} [description]
	 */
	totalmem: () => Ti.Platform.totalMemory,
	type: () => 'Unknown', // overridden per-platform at bottom
	/**
	 * The `os.uptime()` method returns the system uptime in number of seconds.
	 * @return {integer} [description]
	 */
	uptime: () => Ti.Platform.uptime,
	userInfo: () => { // fake it!
		return {
			uid: -1,
			guid: -1,
			username: Ti.Platform.username,
			homedir: Ti.Filesystem.applicationDataDirectory,
			shell: null
		};
	}
};

// On specific platforms, override implementations because we don't have them
// yet and need to fake it, or to hack them
// I'm also doing this in blocks to assign implementations that don't need to consult platform
// type at runtime (hopefully speeding up execution at runtime)
if (isIOS) {
	OS.type = () => 'Darwin';

	// Now a giant hack for looking up CPU info for OS.cpus() on iOS
	// https://www.theiphonewiki.com/wiki/List_of_iPhones
	const AppleMap = {
		// iPhone XR
		'iPhone11,8': [ 'Apple A12 Bionic @ 2.49 GHz', 2490 ],
		// iPhone XS Max
		'iPhone11,6': [ 'Apple A12 Bionic @ 2.49 GHz', 2490 ],
		'iPhone11,4': [ 'Apple A12 Bionic @ 2.49 GHz', 2490 ],
		// iPhone XS
		'iPhone11,2': [ 'Apple A12 Bionic @ 2.49 GHz', 2490 ],
		// iPhone X
		'iPhone10,6': [ 'Apple A11 Bionic @ 2.39 GHz', 2390 ],
		'iPhone10,3': [ 'Apple A11 Bionic @ 2.39 GHz', 2390 ],
		// iPhone 8 Plus
		'iPhone10,5': [ 'Apple A11 Bionic @ 2.39 GHz', 2390 ],
		'iPhone10,2': [ 'Apple A11 Bionic @ 2.39 GHz', 2390 ],
		// iPhone 8
		'iPhone10,4': [ 'Apple A11 Bionic @ 2.39 GHz', 2390 ],
		'iPhone10,1': [ 'Apple A11 Bionic @ 2.39 GHz', 2390 ],
		// iPhone 7 Plus
		'iPhone9,4': [ 'Apple A10 Fusion @ 2.34 GHz', 2340 ],
		'iPhone9,2': [ 'Apple A10 Fusion @ 2.34 GHz', 2340 ],
		// iPhone 7
		'iPhone9,3': [ 'Apple A10 Fusion @ 2.34 GHz', 2340 ],
		'iPhone9,1': [ 'Apple A10 Fusion @ 2.34 GHz', 2340 ],
		// iPhone SE
		'iPhone8,4': [ 'Apple A9 Twister @ 1.85 GHz', 1850 ],
		// iPhone 6s Plus
		'iPhone8,2': [ 'Apple A9 Twister @ 1.85 GHz', 1850 ],
		// iPhone 6s
		'iPhone8,1': [ 'Apple A9 Twister @ 1.85 GHz', 1850 ],
		// iPhone 6 Plus
		'iPhone7,1': [ 'Apple A8 Typhoon @ 1.38 GHz', 1380 ],
		// iPhone 6
		'iPhone7,2': [ 'Apple A8 Typhoon @ 1.38 GHz', 1380 ],
		// iPhone 5s
		'iPhone6,2': [ 'Apple A7 Cyclone @ 1.3 GHz', 1300 ],
		'iPhone6,1': [ 'Apple A7 Cyclone @ 1.3 GHz', 1300 ],
		// iPhone 5c
		'iPhone5,4': [ 'Apple A6 Swift @ 1.2 GHz', 1200 ],
		'iPhone5,3': [ 'Apple A6 Swift @ 1.2 GHz', 1200 ],
		// iPhone 5
		'iPhone5,1': [ 'Apple A6 Swift @ 1.2 GHz', 1200 ],
		'iPhone5,2': [ 'Apple A6 Swift @ 1.2 GHz', 1200 ],
		// iPhone 4s
		'iPhone4,1': [ 'Apple A5 @ 800 MHz', 800 ],
		// iPhone 4
		'iPhone3,3': [ 'Apple A4 @ 800 MHz', 800 ],
		'iPhone3,2': [ 'Apple A4 @ 800 MHz', 800 ],
		'iPhone3,1': [ 'Apple A4 @ 800 MHz', 800 ],
		// iPhone 3GS
		'iPhone2,1': [ 'Samsung S5L8920 @ 620 MHz', 620 ],
		// iPhone 3G
		'iPhone1,2': [ 'Samsung S5L8900 @ 412 MHz', 412 ],
		// iPhone
		'iPhone1,1': [ 'Samsung S5L8900 @ 412 MHz', 412 ],

		// ////// iPads
		// https://www.theiphonewiki.com/wiki/List_of_iPads
		// https://en.wikipedia.org/wiki/IPad
		// iPad Pro (12.9" 3rd gen)
		'iPad8,8': [ 'Apple A12X @ 2.49 GHz', 2490 ],
		'iPad8,7': [ 'Apple A12X @ 2.49 GHz', 2490 ],
		'iPad8,6': [ 'Apple A12X @ 2.49 GHz', 2490 ],
		'iPad8,5': [ 'Apple A12X @ 2.49 GHz', 2490 ],
		// iPad Pro (11")
		'iPad8,4': [ 'Apple A12X @ 2.49 GHz', 2490 ],
		'iPad8,3': [ 'Apple A12X @ 2.49 GHz', 2490 ],
		'iPad8,2': [ 'Apple A12X @ 2.49 GHz', 2490 ],
		'iPad8,1': [ 'Apple A12X @ 2.49 GHz', 2490 ],
		// iPad (6th gen)
		'iPad7,6': [ 'Apple A10 @ 2.31 GHz', 2310 ], // FIXME: Wikipedia says 2.34 GHz
		'iPad7,5': [ 'Apple A10 @ 2.31 GHz', 2310 ],
		// iPad Pro (10.5")
		'iPad7,4': [ 'Apple A10X @ 2.38 GHz', 2380 ],
		'iPad7,3': [ 'Apple A10X @ 2.38 GHz', 2380 ],
		// iPad Pro (12.9" 2nd gen)
		'iPad7,2': [ 'Apple A10X @ 2.38 GHz', 2380 ],
		'iPad7,1': [ 'Apple A10X @ 2.38 GHz', 2380 ],
		// iPad (5th gen)
		'iPad6,12': [ 'Apple A9 @ 1.85 GHz', 1850 ],
		'iPad6,11': [ 'Apple A9 @ 1.85 GHz', 1850 ],
		// iPad Pro (12.9" 1st gen)
		'iPad6,8': [ 'Apple A9X @ 2.24 GHz', 2240 ],
		'iPad6,7': [ 'Apple A9X @ 2.24 GHz', 2240 ],
		// iPad Pro (9.7")
		'iPad6,4': [ 'Apple A9X @ 2.16 GHz', 2160 ],
		'iPad6,3': [ 'Apple A9X @ 2.16 GHz', 2160 ],
		// iPad Air 2
		'iPad5,4': [ 'Apple A8X @ 1.5 GHz', 1500 ],
		'iPad5,3': [ 'Apple A8X @ 1.5 GHz', 1500 ],
		// iPad Mini 4
		'iPad5,2': [ 'Apple A8 @ 1.49 GHz', 1490 ],
		'iPad5,1': [ 'Apple A8 @ 1.49 GHz', 1490 ],
		// iPad Mini 3
		'iPad4,9': [ 'Apple A7 @ 1.3 GHz', 1300 ],
		'iPad4,8': [ 'Apple A7 @ 1.3 GHz', 1300 ],
		'iPad4,7': [ 'Apple A7 @ 1.3 GHz', 1300 ],
		// iPad Mini 2
		'iPad4,6': [ 'Apple A7 @ 1.3 GHz', 1300 ],
		'iPad4,5': [ 'Apple A7 @ 1.3 GHz', 1300 ],
		'iPad4,4': [ 'Apple A7 @ 1.3 GHz', 1300 ],
		// iPad Air 2
		'iPad4,3': [ 'Apple A7 Rev A @ 1.4 GHz', 1400 ],
		'iPad4,2': [ 'Apple A7 Rev A @ 1.4 GHz', 1400 ],
		'iPad4,1': [ 'Apple A7 Rev A @ 1.4 GHz', 1400 ],
		// iPad (4th gen)
		'iPad3,6': [ 'Apple A6X @ 1.4 GHz', 1400 ],
		'iPad3,5': [ 'Apple A6X @ 1.4 GHz', 1400 ],
		'iPad3,4': [ 'Apple A6X @ 1.4 GHz', 1400 ],
		// iPad (3rd gen)
		'iPad3,3': [ 'Apple A5X @ 1 GHz', 1000 ],
		'iPad3,2': [ 'Apple A5X @ 1 GHz', 1000 ],
		'iPad3,1': [ 'Apple A5X @ 1 GHz', 1000 ],
		// iPad Mini
		'iPad2,7': [ 'Apple A5 Rev A @ 1 GHz', 1000 ],
		'iPad2,6': [ 'Apple A5 Rev A @ 1 GHz', 1000 ],
		'iPad2,5': [ 'Apple A5 Rev A @ 1 GHz', 1000 ],
		// iPad 2
		'iPad2,4': [ 'Apple A5 @ 1 GHz', 1000 ],
		'iPad2,3': [ 'Apple A5 @ 1 GHz', 1000 ],
		'iPad2,2': [ 'Apple A5 @ 1 GHz', 1000 ],
		'iPad2,1': [ 'Apple A5 @ 1 GHz', 1000 ],
		// iPad
		'iPad1,1': [ 'Apple A4 @ 1 GHz', 1000 ],
	};

	/**
	 * [cpuModel description]
	 * @param  {string} model [description]
	 * @return {array}       [description]
	 */
	const cpuModelAndSpeed = (model) => {
		const trimmed = model.replace(' (Simulator)', '').trim();
		return AppleMap[trimmed];
	};
	// override cpus impl
	OS.cpus = () => {
		// TODO: Cache the result!
		const count = Ti.Platform.processorCount;
		const modelAndSpeed = cpuModelAndSpeed(Ti.Platform.model);
		const array = [];
		for (let i = 0; i < count; i++) {
			array.push({
				model: modelAndSpeed[0],
				speed: modelAndSpeed[1],
				times: {}
			});
		}
		return array;
	};
} else if (isWin32) {
	OS.uptime = () => 0; // FIXME: Implement!
	OS.totalmem = () =>  Number.MAX_VALUE; // FIXME: Implement!
	OS.EOL = '\r\n';
	OS.type = () => 'Windows_NT';
	OS.constants = {
		UV_UDP_REUSEADDR: 4,
		dlopen: {},
		errno: {
			E2BIG: 7,
			EACCES: 13,
			EADDRINUSE: 100,
			EADDRNOTAVAIL: 101,
			EAFNOSUPPORT: 102,
			EAGAIN: 11,
			EALREADY: 103,
			EBADF: 9,
			EBADMSG: 104,
			EBUSY: 16,
			ECANCELED: 105,
			ECHILD: 10,
			ECONNABORTED: 106,
			ECONNREFUSED: 107,
			ECONNRESET: 108,
			EDEADLK: 36,
			EDESTADDRREQ: 109,
			EDOM: 33,
			EEXIST: 17,
			EFAULT: 14,
			EFBIG: 27,
			EHOSTUNREACH: 110,
			EIDRM: 111,
			EILSEQ: 42,
			EINPROGRESS: 112,
			EINTR: 4,
			EINVAL: 22,
			EIO: 5,
			EISCONN: 113,
			EISDIR: 21,
			ELOOP: 114,
			EMFILE: 24,
			EMLINK: 31,
			EMSGSIZE: 115,
			ENAMETOOLONG: 38,
			ENETDOWN: 116,
			ENETRESET: 117,
			ENETUNREACH: 118,
			ENFILE: 23,
			ENOBUFS: 119,
			ENODATA: 120,
			ENODEV: 19,
			ENOENT: 2,
			ENOEXEC: 8,
			ENOLCK: 39,
			ENOLINK: 121,
			ENOMEM: 12,
			ENOMSG: 122,
			ENOPROTOOPT: 123,
			ENOSPC: 28,
			ENOSR: 124,
			ENOSTR: 125,
			ENOSYS: 40,
			ENOTCONN: 126,
			ENOTDIR: 20,
			ENOTEMPTY: 41,
			ENOTSOCK: 128,
			ENOTSUP: 129,
			ENOTTY: 25,
			ENXIO: 6,
			EOPNOTSUPP: 130,
			EOVERFLOW: 132,
			EPERM: 1,
			EPIPE: 32,
			EPROTO: 134,
			EPROTONOSUPPORT: 135,
			EPROTOTYPE: 136,
			ERANGE: 34,
			EROFS: 30,
			ESPIPE: 29,
			ESRCH: 3,
			ETIME: 137,
			ETIMEDOUT: 138,
			ETXTBSY: 139,
			EWOULDBLOCK: 140,
			EXDEV: 18,
			WSAEINTR: 10004,
			WSAEBADF: 10009,
			WSAEACCES: 10013,
			WSAEFAULT: 10014,
			WSAEINVAL: 10022,
			WSAEMFILE: 10024,
			WSAEWOULDBLOCK: 10035,
			WSAEINPROGRESS: 10036,
			WSAEALREADY: 10037,
			WSAENOTSOCK: 10038,
			WSAEDESTADDRREQ: 10039,
			WSAEMSGSIZE: 10040,
			WSAEPROTOTYPE: 10041,
			WSAENOPROTOOPT: 10042,
			WSAEPROTONOSUPPORT: 10043,
			WSAESOCKTNOSUPPORT: 10044,
			WSAEOPNOTSUPP: 10045,
			WSAEPFNOSUPPORT: 10046,
			WSAEAFNOSUPPORT: 10047,
			WSAEADDRINUSE: 10048,
			WSAEADDRNOTAVAIL: 10049,
			WSAENETDOWN: 10050,
			WSAENETUNREACH: 10051,
			WSAENETRESET: 10052,
			WSAECONNABORTED: 10053,
			WSAECONNRESET: 10054,
			WSAENOBUFS: 10055,
			WSAEISCONN: 10056,
			WSAENOTCONN: 10057,
			WSAESHUTDOWN: 10058,
			WSAETOOMANYREFS: 10059,
			WSAETIMEDOUT: 10060,
			WSAECONNREFUSED: 10061,
			WSAELOOP: 10062,
			WSAENAMETOOLONG: 10063,
			WSAEHOSTDOWN: 10064,
			WSAEHOSTUNREACH: 10065,
			WSAENOTEMPTY: 10066,
			WSAEPROCLIM: 10067,
			WSAEUSERS: 10068,
			WSAEDQUOT: 10069,
			WSAESTALE: 10070,
			WSAEREMOTE: 10071,
			WSASYSNOTREADY: 10091,
			WSAVERNOTSUPPORTED: 10092,
			WSANOTINITIALISED: 10093,
			WSAEDISCON: 10101,
			WSAENOMORE: 10102,
			WSAECANCELLED: 10103,
			WSAEINVALIDPROCTABLE: 10104,
			WSAEINVALIDPROVIDER: 10105,
			WSAEPROVIDERFAILEDINIT: 10106,
			WSASYSCALLFAILURE: 10107,
			WSASERVICE_NOT_FOUND: 10108,
			WSATYPE_NOT_FOUND: 10109,
			WSA_E_NO_MORE: 10110,
			WSA_E_CANCELLED: 10111,
			WSAEREFUSED: 10112
		},
		signals: {
			SIGHUP: 1,
			SIGINT: 2,
			SIGILL: 4,
			SIGABRT: 22,
			SIGFPE: 8,
			SIGKILL: 9,
			SIGSEGV: 11,
			SIGTERM: 15,
			SIGBREAK: 21,
			SIGWINCH: 28
		},
		priority: {
			PRIORITY_LOW: 19,
			PRIORITY_BELOW_NORMAL: 10,
			PRIORITY_NORMAL: 0,
			PRIORITY_ABOVE_NORMAL: -7,
			PRIORITY_HIGH: -14,
			PRIORITY_HIGHEST: -20
		}
	};
} else if (isAndroid) {
	OS.cpus = () => Ti.Platform.cpus();
	OS.type = () => 'Linux';
}

export default OS;
