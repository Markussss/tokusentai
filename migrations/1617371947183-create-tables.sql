--------------------------------------------------------------------------------
-- Create tables - 2021-04-02
--------------------------------------------------------------------------------


-- Up
--------------------------------------------------------------------------------

create table if not exists messages (
    id varchar(64) primary key,
    username varchar(255),
    author varchar(64),
    message text,
    channel varchar(64),
    length integer unsigned,
    timestamp integer unsigned,
    lang char(3),
    wordcount integer unsigned
);

create table if not exists responses (
  trigger text,
  response text,
  type varchar(10),
  probability float unsigned,
  extra text,
  unique(trigger, response)
);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

drop table messages;
drop table responses;
