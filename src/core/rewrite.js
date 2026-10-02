// redundant pairs: the compiler rewrites them, the decoder never emits them
const RW={'1 skip':['tail'],'1 %':['frac'],'sort rev':['sortd'],'digits sum':['dsum'],'0 +':[],'0 -':[],'1 *':[],'1 div':[],'1 pow':[],'swap swap':[],'rev rev':[],'neg neg':[],'inc dec':[],'dec inc':[],'dup drop':[],'ord chr':[],
 'sort sort':['sort'],'uniq uniq':['uniq'],'abs abs':['abs'],'sign sign':['sign'],'floor floor':['floor'],'ceil ceil':['ceil'],'round round':['round'],'up up':['up'],'low low':['low'],'up low':['low'],'low up':['up']};
for(const op of['+','*','=','eql','min2','max2','gcd'])RW['swap '+op]=[op];
const BAN={};for(const k in RW){const[a,b]=k.split(' ');(BAN[a]||(BAN[a]=new Set)).add(b)}

export {RW,BAN};
