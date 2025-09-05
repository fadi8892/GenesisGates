export type Sex = 'M' | 'F' | 'U'
export type Person = {
id: string
name: string
fatherId?: string|null
motherId?: string|null
spouseId?: string|null
sex?: Sex
bLat?: string
bLon?: string
birthPlace?: string
}
export type TreeData = { id: string; people: Person[] }
