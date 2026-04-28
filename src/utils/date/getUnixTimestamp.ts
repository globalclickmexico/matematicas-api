const getUnixTimestamp = () => {
  return Math.floor(new Date().getTime() / 1000);
};

export default getUnixTimestamp;
