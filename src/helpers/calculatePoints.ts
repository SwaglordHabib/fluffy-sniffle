export const calculatePoints = (arr: any) => {
    arr.forEach((element: any, index: number) => {
        element.Points = `+${index}`;
    });
    return arr;
};
