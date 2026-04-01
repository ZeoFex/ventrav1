import { StaffEditView } from "@/app/components/dashboard/staff/staff-edit-view";
type Pageprops = {
    params:Promise<{id:string}>;
}


export default async function StaffEditPage({params}:Pageprops){
    const {id} = await params
    return <StaffEditView staffId={id} />
}