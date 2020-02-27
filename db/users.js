var records = [
    { id: 1, username: 'dimon', password: '$2a$10$6eufG7LBzWG8.zyoxsldSOko6QG0HsCzgb0CAmtpUxUa2zebYD2VG', displayName: 'dimon', emails: [ { value: 'abashin_dv@gmail.com' } ] }
];

exports.findByUsername = function(username, cb) {
  process.nextTick(function() {
    for (var i = 0, len = records.length; i < len; i++) {
      var record = records[i];
      if (record.username === username) {
        return cb(null, record);
      }
    }
    return cb(null, null);
  });
};

exports.findById = function(id, cb) {
    process.nextTick(function() {
        var idx = id - 1;
        if (records[idx]) {
            cb(null, records[idx]);
        } else {
            cb(new Error('User ' + id + ' does not exist'));
        }
    });
};
